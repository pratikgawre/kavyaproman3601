package com.team1.backend.util;

import java.util.Arrays;

public final class Base32 {
    private static final char[] ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".toCharArray();
    private static final int[] DECODE_TABLE = new int[128];

    static {
        Arrays.fill(DECODE_TABLE, -1);
        for (int i = 0; i < ALPHABET.length; i++) {
            char c = ALPHABET[i];
            if (c < DECODE_TABLE.length) {
                DECODE_TABLE[c] = i;
            }
        }
    }

    private Base32() {}

    public static String encode(byte[] data) {
        if (data == null || data.length == 0) {
            return "";
        }

        StringBuilder out = new StringBuilder((data.length * 8 + 4) / 5);
        int buffer = data[0] & 0xFF;
        int next = 1;
        int bitsLeft = 8;

        while (bitsLeft > 0 || next < data.length) {
            if (bitsLeft < 5) {
                if (next < data.length) {
                    buffer <<= 8;
                    buffer |= data[next++] & 0xFF;
                    bitsLeft += 8;
                } else {
                    int pad = 5 - bitsLeft;
                    buffer <<= pad;
                    bitsLeft += pad;
                }
            }

            int index = (buffer >> (bitsLeft - 5)) & 0x1F;
            bitsLeft -= 5;
            out.append(ALPHABET[index]);
        }

        return out.toString();
    }

    public static byte[] decode(String base32) {
        if (base32 == null) {
            return new byte[0];
        }

        String normalized = base32.trim().toUpperCase().replace("=", "");
        normalized = normalized.replaceAll("\\s+", "");
        if (normalized.isEmpty()) {
            return new byte[0];
        }

        int outLength = normalized.length() * 5 / 8;
        byte[] out = new byte[outLength];

        int buffer = 0;
        int bitsLeft = 0;
        int count = 0;

        for (int i = 0; i < normalized.length(); i++) {
            char c = normalized.charAt(i);
            if (c >= DECODE_TABLE.length || DECODE_TABLE[c] == -1) {
                throw new IllegalArgumentException("Invalid Base32 character: " + c);
            }

            buffer <<= 5;
            buffer |= DECODE_TABLE[c];
            bitsLeft += 5;

            if (bitsLeft >= 8) {
                out[count++] = (byte) ((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }

        if (count == out.length) {
            return out;
        }
        return Arrays.copyOf(out, count);
    }
}

