/**
 * @module codeframe
 * @author Rube
 * @date 15/7/20
 * @desc websocket传输数据的加解密与转码
 */

function decodeFrame(frame) {
    if (frame.length < 2) {
        return null;
    }

    var counter = 0,
        fin_offset = 7,
        opcode_offset = parseInt(1111, 2),   //15
        mask_offset = 7,
        payload_len_offset = parseInt(1111111, 2),   //127
        FIN,
        Opcode,
        MASK,
        Payload_len,
        buffer,
        Masking_key,
        i,
        j;

    FIN = frame[counter] >> fin_offset;

    Opcode = frame[counter++] & opcode_offset;
    MASK = frame[counter] >> mask_offset;
    Payload_len = frame[counter++] & payload_len_offset;
    Payload_len === 126 && (Payload_len = frame.readUInt16BE(counter)) && (counter += 2);
    Payload_len === 127 && (Payload_len = frame.readUInt32BE(counter + 4)) && (counter += 8);

    buffer = new Buffer(Payload_len);
    if (MASK) {
        Masking_key = frame.slice(counter, counter + 4);
        counter += 4;
        for (i = 0; i < Payload_len; i++) {
            j = i % 4;
            buffer[i] = frame[counter + i] ^ Masking_key[j];
        }
    }
    if (frame.length < counter + Payload_len) {
        return undefined;
    }

    frame = frame.slice(counter + Payload_len);

    return {
        FIN: FIN,
        Opcode: Opcode,
        MASK: MASK,
        Payload_len: Payload_len,
        Payload_data: buffer,
        frame: frame
    };
}

function encodeFrame(frame) {
    var preBytes = [],

        payBytes = new Buffer(frame.Payload_data),
        dataLength = payBytes.length;
    preBytes.push((frame.FIN << 7) + frame.Opcode);

    if (dataLength < 126) {
        preBytes.push((frame.MASK << 7) + dataLength);
    }

    else if (dataLength < Math.pow(2, 16)) {
        preBytes.push(
            (frame.MASK << 7) + 126,
            (dataLength && 0xFF00) >> 8,
            dataLength && 0xFF
        );
    }
    else {
        preBytes.push(
            (frame.MASK << 7) + 127,
            0, 0, 0, 0,
            (dataLength && 0xFF000000) >> 24,
            (dataLength && 0xFF0000) >> 16,
            (dataLength && 0xFF00) >> 8,
            dataLength && 0xFF
        );
    }
    preBytes = new Buffer(preBytes);
    payBytes = new Buffer(payBytes);
    payBytes.write(preBytes);
    return payBytes;
}

exports.decodeFrame = decodeFrame;
exports.encodeFrame = encodeFrame;