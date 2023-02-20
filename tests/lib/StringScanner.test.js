/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { StringScanner } = require('../../dist/lib/StringScanner');

describe('StringScanner', () => {
  describe('charCount', () => {
    it('is the number of UTF-8 characters in the string', () => {
      let s = new StringScanner('🥧😋');
      assert.strictEqual(s.charCount, 2);
    });
  });

  describe('charIndex', () => {
    it('is the character index of the current scanner position', () => {
      let s = new StringScanner('🥧🤤');
      assert.strictEqual(s.charIndex, 0);
      s.advance();
      assert.strictEqual(s.charIndex, 1);
    });
  });

  describe('isEnd', () => {
    describe('when the character index is before the end of the string', () => {
      it('is `false`', () => {
        let s = new StringScanner('a');
        assert.strictEqual(s.isEnd, false);
      });
    });

    describe('when the character index is at the end of the string', () => {
      it('is `true`', () => {
        let s = new StringScanner('a');
        s.advance();
        assert.strictEqual(s.isEnd, true);
      });
    });

    describe('when the character index is beyond the end of the string', () => {
      it('is `true`', () => {
        let s = new StringScanner('a');
        s.charIndex = 42;
        assert.strictEqual(s.isEnd, true);
      });
    });
  });

  describe('string', () => {
    it('is the string being scanned', () => {
      let s = new StringScanner('foo');
      assert.strictEqual(s.string, 'foo');
    });
  });

  describe('advance()', () => {
    describe('when `count` is not given', () => {
      it('advances the character index by one character', () => {
        let s = new StringScanner('🥧😋');
        s.advance();
        assert.strictEqual(s.charIndex, 1);
      });
    });

    describe('when `count` is given', () => {
      it('advances the character index by the given number of characters', () => {
        let s = new StringScanner('🥧😋');
        s.advance(2);
        assert.strictEqual(s.charIndex, 2);
      });
    });

    it('does not advance past the end of the string', () => {
      let s = new StringScanner('🥧😋');
      s.advance(42);
      assert.strictEqual(s.charIndex, 2);
    });
  });

  describe('consume()', () => {
    describe('when `count` is not given', () => {
      it('consumes and returns one character', () => {
        let s = new StringScanner('🥧😋');
        assert.strictEqual(s.consume(), '🥧');
        assert.strictEqual(s.charIndex, 1);
      });
    });

    describe('when `count` is given', () => {
      it('consumes and returns the given number of characters', () => {
        let s = new StringScanner('🥧😋');
        assert.strictEqual(s.consume(2), '🥧😋');
        assert.strictEqual(s.charIndex, 2);
      });

      it('stops consuming at the end of the string', () => {
        let s = new StringScanner('🥧😋');
        assert.strictEqual(s.consume(42), '🥧😋');
        assert.strictEqual(s.charIndex, 2);
      });
    });

    describe('when there are no characters left to consume', () => {
      it('returns an empty string', () => {
        let s = new StringScanner('');
        assert.strictEqual(s.consume(42), '');
        assert.strictEqual(s.charIndex, 0);
      });
    });
  });

  describe('consumeBytes()', () => {
    it('consumes and returns the given number of bytes', () => {
      let s = new StringScanner('😺 bar baz');
      assert.strictEqual(s.consumeBytes(6), '😺 bar');
      assert.strictEqual(s.charIndex, 5);
    });

    it('stops consuming at the end of the string', () => {
      let s = new StringScanner('foo bar baz');
      assert.strictEqual(s.consumeBytes(42), 'foo bar baz');
      assert.strictEqual(s.charIndex, 11);
    });

    describe('when there are no characters left to consume', () => {
      it('returns an empty string', () => {
        let s = new StringScanner('');
        assert.strictEqual(s.consumeBytes(42), '');
        assert.strictEqual(s.charIndex, 0);
      });
    });
  });

  describe('consumeMatchFn()', () => {
    it('consumes characters as long as the function returns `true`', () => {
      let s = new StringScanner('🥧abcdef😋');
      let result = s.consumeMatchFn((char) => char === '🥧' || char === 'a' || char === 'b');
      assert.strictEqual(result, '🥧ab');
      assert.strictEqual(s.charIndex, 3);
    });

    describe('when the scanner is at the end of the input string', () => {
      it('returns an empty string', () => {
        let s = new StringScanner('🥧abcdef😋');
        s.reset(8);
        assert.strictEqual(s.consumeMatchFn(() => true), '');
      });
    });
  });

  describe('consumeString()', () => {
    describe('when a string with multibyte chars matches at the current scanner position', () => {
      it('consumes and returns the match', () => {
        let s = new StringScanner('🥧abcdef😋');
        assert.strictEqual(s.consumeString('🥧abc'), '🥧abc');
        assert.strictEqual(s.charIndex, 4);
      });
    });

    describe('when a string with multibyte chars does not match at the current scanner position', () => {
      it('returns an empty string and does not advance', () => {
        let s = new StringScanner('🥧abcdef😋');
        assert.strictEqual(s.consumeString('🥧xyz'), '');
        assert.strictEqual(s.charIndex, 0);
      });
    });

    describe('when a string with single byte chars matches at the current scanner position', () => {
      it('consumes and returns the match', () => {
        let s = new StringScanner('abcdef');
        assert.strictEqual(s.consumeString('abc'), 'abc');
        assert.strictEqual(s.charIndex, 3);
      });
    });

    describe('when a string with single byte chars does not match at the current scanner position', () => {
      it('returns an empty string and does not advance', () => {
        let s = new StringScanner('abcdef');
        assert.strictEqual(s.consumeString('xyz'), '');
        assert.strictEqual(s.charIndex, 0);
      });
    });
  });

  describe('consumeUntilMatch()', () => {
    describe('when the regex matches', () => {
      it('consumes and returns characters up to the beginning of the match', () => {
        let s = new StringScanner('🥧abcdef😋');
        assert.strictEqual(s.consumeUntilMatch(/😋/g), '🥧abcdef');
        assert.strictEqual(s.charIndex, 7);
      });
    });

    describe('when the regex does not match', () => {
      it('returns an empty string and does not advance', () => {
        let s = new StringScanner('🥧abcdef😋');
        assert.strictEqual(s.consumeUntilMatch(/🤮/g), '');
        assert.strictEqual(s.charIndex, 0);
      });
    });
  });

  describe('consumeUntilString()', () => {
    describe('when the string is found', () => {
      it('consumes and returns characters up to the beginning of the match', () => {
        let s = new StringScanner('🥧abcdef😋');
        assert.strictEqual(s.consumeUntilString('😋'), '🥧abcdef');
        assert.strictEqual(s.charIndex, 7);
      });
    });

    describe('when the string is not found', () => {
      it('returns an empty string and does not advance', () => {
        let s = new StringScanner('🥧abcdef😋');
        assert.strictEqual(s.consumeUntilString('🤮'), '');
        assert.strictEqual(s.charIndex, 0);
      });
    });
  });

  describe('peek()', () => {
    describe('when `count` is not given', () => {
      it('returns the character at the current scanner position without advancing', () => {
        let s = new StringScanner('🥧abcdef😋');
        assert.strictEqual(s.peek(), '🥧');
        assert.strictEqual(s.charIndex, 0);
      });

      describe('and the scanner is at the end of the string', () => {
        it('returns an empty string', () => {
          let s = new StringScanner('🥧abcdef😋');
          s.advance(8);
          assert.strictEqual(s.peek(), '');
          assert.strictEqual(s.charIndex, 8);
        });
      });
    });

    describe('when `count` is given', () => {
      it('returns the given number of characters starting at the current scanner position without advancing', () => {
        let s = new StringScanner('🥧abcdef😋');
        assert.strictEqual(s.peek(4), '🥧abc');
        assert.strictEqual(s.charIndex, 0);
      });

      describe('and the scanner is at the end of the string', () => {
        it('returns an empty string', () => {
          let s = new StringScanner('🥧abcdef😋');
          s.advance(8);
          assert.strictEqual(s.peek(4), '');
          assert.strictEqual(s.charIndex, 8);
        });
      });

      describe('and `count` would exceed the end of the string', () => {
        it('returns characters up to the end of the string', () => {
          let s = new StringScanner('🥧abcdef😋');
          s.advance(6);
          assert.strictEqual(s.peek(4), 'f😋');
          assert.strictEqual(s.charIndex, 6);
        });
      });
    });
  });

  describe('reset()', () => {
    describe('when `index` is not given', () => {
      it('resets the scanner position to the beginning of the string', () => {
        let s = new StringScanner('🥧abcdef😋');
        s.advance(4);
        s.reset();
        assert.strictEqual(s.charIndex, 0);
      });
    });

    describe('when `index` is positive', () => {
      it('resets the scanner position to the given index', () => {
        let s = new StringScanner('🥧abcdef😋');
        s.advance(1);
        s.reset(4);
        assert.strictEqual(s.charIndex, 4);
      });

      describe('when `index` is beyond the length of the string', () => {
        it('resets the scanner position to the end of the string', () => {
          let s = new StringScanner('🥧abcdef😋');
          s.reset(42);
          assert.strictEqual(s.charIndex, 8);
        });
      });
    });

    describe('when `index` is  negative', () => {
      it('subtracts `index` from the current scanner position', () => {
        let s = new StringScanner('🥧abcdef😋');
        s.advance(4);
        s.reset(-3);
        assert.strictEqual(s.charIndex, 1);
      });

      describe('when this would result in a scanner position before the beginning of the string', () => {
        it('resets the scanner position to the beginning of the string', () => {
          let s = new StringScanner('🥧abcdef😋');
          s.reset(-1);
          assert.strictEqual(s.charIndex, 0);
        });
      });
    });
  });
});
