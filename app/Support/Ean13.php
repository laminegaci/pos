<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Product;

/** EAN-13 helpers: validation, internal code generation and SVG rendering. */
final class Ean13
{
    private const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];

    private const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];

    private const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];

    private const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

    public static function checksum(string $first12): int
    {
        $sum = 0;
        foreach (str_split($first12) as $i => $d) {
            $sum += (int) $d * ($i % 2 === 0 ? 1 : 3);
        }

        return (10 - $sum % 10) % 10;
    }

    public static function isValid(?string $code): bool
    {
        return is_string($code)
            && preg_match('/^\d{13}$/', $code) === 1
            && self::checksum(substr($code, 0, 12)) === (int) $code[12];
    }

    /** Free store-internal code (prefix 2 is reserved for in-store use). */
    public static function generateInternal(): string
    {
        do {
            $base = '2'.str_pad((string) random_int(0, 99999999999), 11, '0', STR_PAD_LEFT);
            $code = $base.self::checksum($base);
        } while (Product::where('barcode', $code)->exists());

        return $code;
    }

    /** Self-contained SVG; one module = 1 unit, quiet zones included. */
    public static function toSvg(string $code, int $height = 60): string
    {
        if (! self::isValid($code)) {
            return '';
        }
        $parity = self::PARITY[(int) $code[0]];
        $bits = '101';
        for ($i = 1; $i <= 6; $i++) {
            $set = $parity[$i - 1] === 'L' ? self::L : self::G;
            $bits .= $set[(int) $code[$i]];
        }
        $bits .= '01010';
        for ($i = 7; $i <= 12; $i++) {
            $bits .= self::R[(int) $code[$i]];
        }
        $bits .= '101';

        $guard = static fn (int $i) => $i < 3 || ($i >= 45 && $i < 50) || $i >= 92;
        $bars = '';
        foreach (str_split($bits) as $i => $b) {
            if ($b === '1') {
                $h = $guard($i) ? $height : $height - 8;
                $bars .= '<rect x="'.($i + 9).'" y="0" width="1" height="'.$h.'"/>';
            }
        }
        $y = $height + 2;
        $text = '<text x="2" y="'.$y.'">'.$code[0].'</text>'
            .'<text x="'.(12 + 21).'" y="'.$y.'" text-anchor="middle" textLength="39" lengthAdjust="spacingAndGlyphs">'.substr($code, 1, 6).'</text>'
            .'<text x="'.(59 + 21).'" y="'.$y.'" text-anchor="middle" textLength="39" lengthAdjust="spacingAndGlyphs">'.substr($code, 7, 6).'</text>';

        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 113 '.($height + 10).'" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges">'
            .'<rect width="113" height="'.($height + 10).'" fill="#fff"/><g fill="#000">'.$bars.'</g>'
            .'<g fill="#000" font-family="monospace" font-size="8">'.$text.'</g></svg>';
    }
}
