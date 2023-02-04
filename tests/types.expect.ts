import { expectTypeOf } from 'expect-type';

import { parseXml, XmlComment, XmlDeclaration, XmlDocument, XmlDocumentType, XmlElement, XmlError, XmlNode, XmlProcessingInstruction, XmlText } from '..';

import type { JsonObject, ParserOptions, XmlCdata } from '..';

// -- parseXml() ---------------------------------------------------------------
expectTypeOf(parseXml).toBeFunction();
expectTypeOf(parseXml).parameter(0).toBeString();
expectTypeOf(parseXml).parameter(1).toEqualTypeOf<ParserOptions | undefined>();
expectTypeOf(parseXml).returns.toEqualTypeOf<XmlDocument>();

// -- ParserOptions ------------------------------------------------------------
expectTypeOf<ParserOptions>().toHaveProperty('ignoreUndefinedEntities').toEqualTypeOf<boolean | undefined>();
expectTypeOf<ParserOptions>().toHaveProperty('includeOffsets').toEqualTypeOf<boolean | undefined>();
expectTypeOf<ParserOptions>().toHaveProperty('preserveCdata').toEqualTypeOf<boolean | undefined>();
expectTypeOf<ParserOptions>().toHaveProperty('preserveComments').toEqualTypeOf<boolean | undefined>();
expectTypeOf<ParserOptions>().toHaveProperty('preserveDocumentType').toEqualTypeOf<boolean | undefined>();
expectTypeOf<ParserOptions>().toHaveProperty('preserveXmlDeclaration').toEqualTypeOf<boolean | undefined>();
expectTypeOf<ParserOptions>().toHaveProperty('resolveUndefinedEntity').toEqualTypeOf<((entity: string) => string | null | undefined) | undefined>();
expectTypeOf<ParserOptions>().toHaveProperty('sortAttributes').toEqualTypeOf<boolean | undefined>();

// -- XmlCdata -----------------------------------------------------------------
expectTypeOf<XmlCdata>().toMatchTypeOf<XmlNode>();
expectTypeOf<XmlCdata>().toMatchTypeOf<XmlText>();

// -- XmlComment ---------------------------------------------------------------
expectTypeOf<XmlComment>().toMatchTypeOf<XmlNode>();
expectTypeOf(XmlComment).instance.toHaveProperty('content').toBeString();

// -- XmlDeclaration -----------------------------------------------------------
expectTypeOf<XmlDeclaration>().toMatchTypeOf<XmlNode>();
expectTypeOf(XmlDeclaration).instance.toHaveProperty('encoding').toEqualTypeOf<string | null>();
expectTypeOf(XmlDeclaration).instance.toHaveProperty('standalone').toEqualTypeOf<'yes' | 'no' | null>();
expectTypeOf(XmlDeclaration).instance.toHaveProperty('version').toBeString();

// -- XmlDocument --------------------------------------------------------------
expectTypeOf<XmlDocument>().toMatchTypeOf<XmlNode>();
expectTypeOf(XmlDocument).instance.toHaveProperty('children').toEqualTypeOf<Array<XmlComment | XmlDeclaration | XmlDocumentType | XmlProcessingInstruction | XmlElement>>();
expectTypeOf(XmlDocument).instance.toHaveProperty('root').toEqualTypeOf<XmlElement | null>();
expectTypeOf(XmlDocument).instance.toHaveProperty('text').toBeString();

// -- XmlDocumentType ----------------------------------------------------------
expectTypeOf<XmlDocumentType>().toMatchTypeOf<XmlNode>();
expectTypeOf(XmlDocumentType).instance.toHaveProperty('name').toBeString();
expectTypeOf(XmlDocumentType).instance.toHaveProperty('publicId').toEqualTypeOf<string | null>();
expectTypeOf(XmlDocumentType).instance.toHaveProperty('systemId').toEqualTypeOf<string | null>();
expectTypeOf(XmlDocumentType).instance.toHaveProperty('internalSubset').toEqualTypeOf<string | null>();

// -- XmlElement ---------------------------------------------------------------
expectTypeOf<XmlElement>().toMatchTypeOf<XmlNode>();
expectTypeOf(XmlElement).instance.toHaveProperty('attributes').toEqualTypeOf<{[attrName: string]: string}>();
expectTypeOf(XmlElement).instance.toHaveProperty('children').toEqualTypeOf<Array<XmlCdata | XmlComment | XmlElement | XmlProcessingInstruction | XmlText>>();
expectTypeOf(XmlElement).instance.toHaveProperty('name').toBeString();
expectTypeOf(XmlElement).instance.toHaveProperty('isEmpty').toBeBoolean();
expectTypeOf(XmlElement).instance.toHaveProperty('text').toBeString();

// -- XmlError -----------------------------------------------------------------
expectTypeOf<XmlError>().toMatchTypeOf<Error>();
expectTypeOf(XmlError).instance.toHaveProperty('column').toBeNumber();
expectTypeOf(XmlError).instance.toHaveProperty('excerpt').toBeString();
expectTypeOf(XmlError).instance.toHaveProperty('line').toBeNumber();
expectTypeOf(XmlError).instance.toHaveProperty('pos').toBeNumber();

// -- XmlNode ------------------------------------------------------------------
expectTypeOf(XmlNode).toHaveProperty('TYPE_CDATA').toEqualTypeOf<'cdata'>();
expectTypeOf(XmlNode).toHaveProperty('TYPE_COMMENT').toEqualTypeOf<'comment'>();
expectTypeOf(XmlNode).toHaveProperty('TYPE_DOCUMENT').toEqualTypeOf<'document'>();
expectTypeOf(XmlNode).toHaveProperty('TYPE_DOCUMENT_TYPE').toEqualTypeOf<'doctype'>();
expectTypeOf(XmlNode).toHaveProperty('TYPE_ELEMENT').toEqualTypeOf<'element'>();
expectTypeOf(XmlNode).toHaveProperty('TYPE_PROCESSING_INSTRUCTION').toEqualTypeOf<'pi'>();
expectTypeOf(XmlNode).toHaveProperty('TYPE_TEXT').toEqualTypeOf<'text'>();
expectTypeOf(XmlNode).toHaveProperty('TYPE_XML_DECLARATION').toEqualTypeOf<'xmldecl'>();
expectTypeOf(XmlNode).instance.toHaveProperty('document').toEqualTypeOf<XmlDocument | null>();
expectTypeOf(XmlNode).instance.toHaveProperty('end').toBeNumber();
expectTypeOf(XmlNode).instance.toHaveProperty('isRootNode').toBeBoolean();
expectTypeOf(XmlNode).instance.toHaveProperty('parent').toEqualTypeOf<XmlDocument | XmlElement | null>();
expectTypeOf(XmlNode).instance.toHaveProperty('preserveWhitespace').toBeBoolean();
expectTypeOf(XmlNode).instance.toHaveProperty('start').toBeNumber();
expectTypeOf(XmlNode).instance.toHaveProperty('toJSON').returns.toEqualTypeOf<JsonObject>();
expectTypeOf(XmlNode).instance.toHaveProperty('type').toBeString();

// -- XmlProcessingInstruction -------------------------------------------------
expectTypeOf<XmlProcessingInstruction>().toMatchTypeOf<XmlNode>();
expectTypeOf(XmlProcessingInstruction).instance.toHaveProperty('content').toBeString();
expectTypeOf(XmlProcessingInstruction).instance.toHaveProperty('name').toBeString();

// -- XmlText ------------------------------------------------------------------
expectTypeOf<XmlText>().toMatchTypeOf<XmlNode>();
expectTypeOf(XmlText).instance.toHaveProperty('text').toBeString();
