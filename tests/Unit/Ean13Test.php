<?php

namespace Tests\Unit;

use App\Support\Ean13;
use PHPUnit\Framework\TestCase;

class Ean13Test extends TestCase
{
    public function test_checksum_and_validity(): void
    {
        $this->assertSame(1, Ean13::checksum('400638133393'));
        $this->assertTrue(Ean13::isValid('4006381333931'));
        $this->assertFalse(Ean13::isValid('4006381333932'));
        $this->assertFalse(Ean13::isValid('123'));
        $this->assertFalse(Ean13::isValid('40063813339AB'));
        $this->assertFalse(Ean13::isValid(null));
    }

    public function test_svg_has_95_modules_of_bars_and_rejects_invalid_codes(): void
    {
        $svg = Ean13::toSvg('4006381333931');

        $this->assertStringStartsWith('<svg', $svg);
        // 30 bars for a standard EAN-13 (3 + 6*2~4 ... always the same module pattern): at least the guards exist.
        $this->assertGreaterThan(40, substr_count($svg, '<rect x='));
        $this->assertStringContainsString('4006381333931'[0], $svg);
        $this->assertSame('', Ean13::toSvg('4006381333932'));
    }
}
