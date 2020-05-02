'use strict';

const emptyArray = Object.freeze([]);
const emptyObject = Object.freeze(Object.create(null));

const namedEntities = Object.freeze({
  '&amp;': '&',
  '&apos;': "'",
  '&gt;': '>',
  '&lt;': '<',
  '&quot;': '"'
});

const NODE_TYPE_CDATA = 'cdata';
const NODE_TYPE_COMMENT = 'comment';
const NODE_TYPE_DOCUMENT = 'document';
const NODE_TYPE_ELEMENT = 'element';
const NODE_TYPE_TEXT = 'text';

let Syntax;

module.exports = function parseXml(xml, options = emptyObject) {
  if (Syntax === void 0) {
    // Lazy require to defer regex parsing until first use.
    Syntax = require('./lib/syntax');
  }

  if (xml[0] === '\uFEFF') {
    // Strip byte order mark.
    xml = xml.slice(1);
  }

  xml = xml.replace(/\r\n?/g, '\n'); // Normalize CRLF and CR to LF.

  let doc = {
    type: NODE_TYPE_DOCUMENT,
    children: [],
    parent: null,
    toJSON: nodeToJson
  };

  let state = {
    length: xml.length,
    options,
    parent: doc,
    pos: 0,
    prevPos: 0,
    xml
  };

  state.replaceReference = replaceReference.bind(state);

  consumeProlog(state);

  if (!consumeElement(state)) {
    error(state, 'Root element is missing or invalid');
  }

  while (consumeMisc(state)) {} // eslint-disable-line no-empty

  if (!isEof(state)) {
    error(state, `Extra content at the end of the document`);
  }

  return doc;
};

// -- Private Functions --------------------------------------------------------
function addNode(state, node) {
  node.parent = state.parent;
  node.toJSON = nodeToJson;

  state.parent.children.push(node);
}

function addText(state, text) {
  let { children } = state.parent;
  let prevNode = children[children.length - 1];

  if (prevNode !== void 0 && prevNode.type === NODE_TYPE_TEXT) {
    // The previous node is a text node, so we can append to it and avoid
    // creating another node.
    prevNode.text += text;
  } else {
    addNode(state, {
      type: NODE_TYPE_TEXT,
      text
    });
  }
}

// Each `consume*` function takes the current state as an argument and returns
// `true` if `state.pos` was advanced (meaning some XML was consumed) or `false`
// if nothing was consumed.

function consumeCDSect(state) {
  let [ match, text ] = scan(state, Syntax.Anchored.CDSect);

  if (match === void 0) {
    return false;
  }

  if (state.options.preserveCdata) {
    addNode(state, {
      type: NODE_TYPE_CDATA,
      text
    });
  } else {
    addText(state, text);
  }

  return true;
}

function consumeCharData(state) {
  let [ text ] = scan(state, Syntax.Anchored.CharData);

  if (text === void 0) {
    return false;
  }

  let cdataCloseIndex = text.indexOf(']]>');

  if (cdataCloseIndex !== -1) {
    state.pos = state.prevPos + cdataCloseIndex;
    error(state, 'Element content may not contain the CDATA section close delimiter `]]>`');
  }

  // Note: XML 1.0 5th ed. says `CharData` is "any string of characters which
  // does not contain the start-delimiter of any markup and does not include the
  // CDATA-section-close delimiter", but the conformance test suite and
  // well-established parsers like libxml seem to restrict `CharData` to
  // characters that match the `Char` symbol, so that's what I've done here.
  if (!Syntax.CharOnly.test(text)) {
    state.pos = state.prevPos + text.search(new RegExp(`(?!${Syntax.Char.source})`));
    error(state, 'Element content contains an invalid character');
  }

  addText(state, text);
  return true;
}

function consumeComment(state) {
  let [ , content ] = scan(state, Syntax.Anchored.Comment);

  if (content === void 0) {
    return false;
  }

  if (state.options.preserveComments) {
    addNode(state, {
      type: NODE_TYPE_COMMENT,
      content: content.trim()
    });
  }

  return true;
}

function consumeDoctypeDecl(state) {
  return scan(state, Syntax.Anchored.doctypedecl).length > 0;
}

function consumeElement(state) {
  let [ tag, name, attrs ] = scan(state, Syntax.Anchored.EmptyElemTag);
  let isEmpty = tag !== void 0;

  if (!isEmpty) {
    [ tag, name, attrs ] = scan(state, Syntax.Anchored.STag);

    if (tag === void 0) {
      return false;
    }
  }

  let { parent } = state;
  let parsedAttrs = parseAttrs(state, attrs);

  let node = {
    type: NODE_TYPE_ELEMENT,
    name,
    attributes: parsedAttrs,
    children: []
  };

  let xmlSpace = parsedAttrs['xml:space'];

  if (xmlSpace === 'preserve'
      || (xmlSpace !== 'default' && parent.preserveWhitespace)) {

    node.preserveWhitespace = true;
  }

  if (!isEmpty) {
    state.parent = node;

    consumeCharData(state);

    while (
      consumeElement(state)
        || consumeReference(state)
        || consumeCDSect(state)
        || consumePI(state)
        || consumeComment(state)
    ) {
      consumeCharData(state);
    }

    let [ , endName ] = scan(state, Syntax.Anchored.ETag);

    if (endName !== name) {
      state.pos = state.prevPos;
      error(state, `Missing end tag for element ${name}`);
    }

    state.parent = parent;
  }

  addNode(state, node);
  return true;
}

function consumeMisc(state) {
  return consumeComment(state)
    || consumePI(state)
    || consumeWhitespace(state);
}

function consumePI(state) {
  let [ match, target ] = scan(state, Syntax.Anchored.PI);

  if (match === void 0) {
    return false;
  }

  if (target.toLowerCase() === 'xml') {
    state.pos = state.prevPos;
    error(state, 'XML declaration is only allowed at the start of the document');
  }

  return true;
}

function consumeProlog(state) {
  let { pos } = state;

  scan(state, Syntax.Anchored.XMLDecl);

  while (consumeMisc(state)) {}  // eslint-disable-line no-empty

  if (consumeDoctypeDecl(state)) {
    while (consumeMisc(state)) {}  // eslint-disable-line no-empty
  }

  return state.pos > pos;
}

function consumeReference(state) {
  let [ ref ] = scan(state, Syntax.Anchored.Reference);

  if (ref === void 0) {
    return false;
  }

  addText(state, state.replaceReference(ref));
  return true;
}

function consumeWhitespace(state) {
  return scan(state, Syntax.Anchored.S).length > 0;
}

function error(state, message) {
  let { pos, xml } = state;
  let column = 1;
  let excerpt = '';
  let line = 1;

  // Find the line and column where the error occurred.
  for (let i = 0; i < pos; ++i) {
    let char = xml[i];

    if (char === '\n') {
      column = 1;
      excerpt = '';
      line += 1;
    } else {
      column += 1;
      excerpt += char;
    }
  }

  let eol = xml.indexOf('\n', pos);

  excerpt += eol === -1
    ? xml.slice(pos)
    : xml.slice(pos, eol);

  let excerptStart = 0;

  // Keep the excerpt below 50 chars, but always keep the error position in
  // view.
  if (excerpt.length > 50) {
    if (column < 40) {
      excerpt = excerpt.slice(0, 50);
    } else {
      excerptStart = column - 20;
      excerpt = excerpt.slice(excerptStart, column + 30);
    }
  }

  let err = new Error(
    `${message} (line ${line}, column ${column})\n`
      + `  ${excerpt}\n`
      + ' '.repeat(column - excerptStart + 1) + '^\n'
  );

  err.column = column;
  err.excerpt = excerpt;
  err.line = line;
  err.pos = pos;

  throw err;
}

function isEof(state) {
  return state.pos >= state.length - 1;
}

function nodeToJson() {
  let json = Object.assign(Object.create(null), this); // eslint-disable-line no-invalid-this
  delete json.parent;
  return json;
}

function normalizeAttrValue(state, value) {
  return value
    .replace(/[\x20\t\r\n]/g, ' ')
    .replace(Syntax.Global.Reference, state.replaceReference);
}

function parseAttrs(state, attrs) {
  let parsedAttrs = Object.create(null);

  if (!attrs) {
    return parsedAttrs;
  }

  let attrPairs = attrs
    .match(Syntax.Global.Attribute)
    .sort();

  for (let i = 0, len = attrPairs.length; i < len; ++i) {
    let attrPair = attrPairs[i];
    let eqMatch = attrPair.match(Syntax.Eq);
    let name = attrPair.slice(0, eqMatch.index);
    let value = attrPair.slice(eqMatch.index + eqMatch[0].length);

    if (name in parsedAttrs) {
      state.pos = state.prevPos;
      error(state, `Attribute \`${name}\` redefined`);
    }

    value = normalizeAttrValue(state, value.slice(1, -1));

    if (name === 'xml:space') {
      if (value !== 'default' && value !== 'preserve') {
        state.pos = state.prevPos;
        error(state, `Value of the \`xml:space\` attribute must be "default" or "preserve"`);
      }
    }

    parsedAttrs[name] = value;
  }

  return parsedAttrs;
}

function replaceReference(ref) {
  let state = this; // eslint-disable-line no-invalid-this

  if (ref[ref.length - 1] !== ';') {
    error(state, `Invalid reference: \`${ref}\``);
  }

  if (ref[1] === '#') {
    // This is a character entity.
    let codePoint;

    if (ref[2] === 'x') {
      codePoint = parseInt(ref.slice(3, -1), 16);
    } else {
      codePoint = parseInt(ref.slice(2, -1), 10);
    }

    if (isNaN(codePoint)) {
      state.pos = state.prevPos;
      error(state, `Invalid character entity \`${ref}\``);
    }

    let char = String.fromCodePoint(codePoint);

    if (!Syntax.Char.test(char)) {
      state.pos = state.prevPos;
      error(state, `Invalid character entity \`${ref}\``);
    }

    return char;
  }

  // This is a named entity.
  let value = namedEntities[ref];

  if (value !== void 0) {
    return value;
  }

  if (state.options.resolveUndefinedEntity) {
    let resolvedValue = state.options.resolveUndefinedEntity(ref);

    if (resolvedValue !== null && resolvedValue !== void 0) {
      return resolvedValue;
    }
  }

  if (state.options.ignoreUndefinedEntities) {
    return ref;
  }

  state.pos = state.prevPos;
  error(state, `Named entity isn't defined: \`${ref}\``);
}

function scan(state, regex) {
  let { pos, xml } = state;

  let xmlToScan = pos > 0
    ? xml.slice(pos)
    : xml;

  let matches = xmlToScan.match(regex);

  if (matches === null) {
    return emptyArray;
  }

  state.prevPos = state.pos;
  state.pos += matches[0].length;

  return matches;
}
