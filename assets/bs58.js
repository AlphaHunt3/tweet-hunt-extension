// bs58 - Simple Base58 implementation for browser
// Based on: https://github.com/cryptocoinjs/bs58
(function () {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const ALPHABET_MAP = {};
  const BASE = 58;

  for (let i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET.charAt(i)] = i;
  }

  function decode(string) {
    if (string.length === 0) return new Uint8Array(0);

    let bytes = [0];
    for (let i = 0; i < string.length; i++) {
      const c = string[i];
      if (!(c in ALPHABET_MAP)) throw new Error('Non-base58 character');

      for (let j = 0; j < bytes.length; j++) bytes[j] *= BASE;
      bytes[0] += ALPHABET_MAP[c];

      let carry = 0;
      for (let j = 0; j < bytes.length; ++j) {
        bytes[j] += carry;
        carry = bytes[j] >> 8;
        bytes[j] &= 0xff;
      }

      while (carry) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }

    // deal with leading zeros
    for (let k = 0; string[k] === '1' && k < string.length - 1; k++) {
      bytes.push(0);
    }

    return new Uint8Array(bytes.reverse());
  }

  function encode(buffer) {
    if (buffer.length === 0) return '';

    const digits = [0];
    for (let i = 0; i < buffer.length; i++) {
      for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
      digits[0] += buffer[i];

      let carry = 0;
      for (let j = 0; j < digits.length; ++j) {
        digits[j] += carry;
        carry = (digits[j] / BASE) | 0;
        digits[j] %= BASE;
      }

      while (carry) {
        digits.push(carry % BASE);
        carry = (carry / BASE) | 0;
      }
    }

    // deal with leading zeros
    for (let k = 0; buffer[k] === 0 && k < buffer.length - 1; k++) {
      digits.push(0);
    }

    return digits
      .reverse()
      .map((digit) => ALPHABET[digit])
      .join('');
  }

  // Export to window
  window.bs58 = {
    decode: decode,
    encode: encode,
  };

  console.log('[XHunt] bs58 loaded successfully');
})();
