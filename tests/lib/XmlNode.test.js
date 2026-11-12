/* eslint-env mocha */
import assert from 'node:assert';

import { XmlComment, XmlDocument, XmlElement, XmlNode } from '@rgrove/parse-xml';

describe('XmlNode', () => {
  describe('document', () => {
    describe('when the node is not associated with a document', () => {
      it('is `null`', () => {
        let node = new XmlNode();
        assert.strictEqual(node.document, null);
      });
    });

    describe('when the node is deeply nested', () => {
      it("is the document and doesn't exhaust the call stack", () => {
        let { doc, leaf } = createDeepTree(100000);
        assert.strictEqual(leaf.document, doc);
      });
    });
  });

  describe('isRootNode', () => {
    it('is `true` for an element whose parent is a document', () => {
      let doc = new XmlDocument();
      let element = new XmlElement('a');
      element.parent = doc;

      assert.strictEqual(element.isRootNode, true);
    });

    it('is `false` for a node that isn\'t an element', () => {
      let doc = new XmlDocument();
      let comment = new XmlComment('a');
      comment.parent = doc;

      assert.strictEqual(comment.isRootNode, false);
    });

    it('is `false` for an element whose parent isn\'t a document', () => {
      assert.strictEqual(new XmlElement('a').isRootNode, false);

      let { leaf } = createDeepTree(100000);
      assert.strictEqual(leaf.isRootNode, false);
    });
  });

  describe('toJSON()', () => {
    describe('when `start` is `-1`', () => {
      it('doesn\'t include the `start` or `end` properties', () => {
        let json = new XmlNode().toJSON();
        assert.strictEqual(json.start, undefined);
        assert.strictEqual(json.end, undefined);
      });
    });

    describe('when `start` is greater than -1', () => {
      it('includes the `start` and `end` properties', () => {
        let node = new XmlNode();
        node.start = 0;
        node.end = 3;

        let json = node.toJSON();
        assert.strictEqual(json.start, 0);
        assert.strictEqual(json.end, 3);
      });
    });
  });

  describe('type', () => {
    it('is an empty string', () => {
      let node = new XmlNode();
      assert.strictEqual(node.type, '');
    });
  });
});

/**
 * Returns a document containing a chain of elements nested _depth_ levels deep,
 * along with the most deeply nested element.
 */
function createDeepTree(depth) {
  let doc = new XmlDocument();
  let leaf = doc;

  for (let i = 0; i < depth; ++i) {
    let element = new XmlElement('a');
    element.parent = leaf;
    leaf.children.push(element);
    leaf = element;
  }

  return { doc, leaf };
}
