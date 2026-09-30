import { labelFor } from './admin-catalog';
export type AdminRow = Record<string, unknown>;
export function csvCell(value: unknown): string {
    let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (/^[\s\u0000-\u001f]*[=+@-]/u.test(text))
        text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
}
export function csv(rows: AdminRow[], fields?: string[]): string {
    const columns = fields || Array.from(new Set(rows.flatMap(row => Object.keys(row))));
    return '\uFEFF' + [columns.map(x => csvCell(labelFor(x))).join(';'), ...rows.map(row => columns.map(x => csvCell(row[x])).join(';'))].join('\r\n') + '\r\n';
}
// ZIP format, stored entries. No executable files or caller-controlled filenames.
function crc32(data: Buffer) { let n = 0xffffffff; for (const b of data) {
    n ^= b;
    for (let i = 0; i < 8; i++)
        n = (n >>> 1) ^ ((n & 1) ? 0xedb88320 : 0);
} return (n ^ 0xffffffff) >>> 0; }
export function zip(entries: {
    name: string;
    content: string;
}[]): Buffer {
    const parts: Buffer[] = [], central: Buffer[] = [];
    let offset = 0;
    for (const entry of entries) {
        if (!/^[a-z_]+\.(csv|txt)$/.test(entry.name))
            throw new Error('Nome inválido.');
        const name = Buffer.from(entry.name), data = Buffer.from(entry.content), crc = crc32(data);
        const h = Buffer.alloc(30);
        h.writeUInt32LE(0x04034b50);
        h.writeUInt16LE(20, 4);
        h.writeUInt16LE(0x800, 6);
        h.writeUInt32LE(crc, 14);
        h.writeUInt32LE(data.length, 18);
        h.writeUInt32LE(data.length, 22);
        h.writeUInt16LE(name.length, 26);
        parts.push(h, name, data);
        const c = Buffer.alloc(46);
        c.writeUInt32LE(0x02014b50);
        c.writeUInt16LE(20, 4);
        c.writeUInt16LE(20, 6);
        c.writeUInt16LE(0x800, 8);
        c.writeUInt32LE(crc, 16);
        c.writeUInt32LE(data.length, 20);
        c.writeUInt32LE(data.length, 24);
        c.writeUInt16LE(name.length, 28);
        c.writeUInt32LE(offset, 42);
        central.push(c, name);
        offset += h.length + name.length + data.length;
    }
    const directory = Buffer.concat(central), end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(directory.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...parts, directory, end]);
}
