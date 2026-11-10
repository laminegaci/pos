<?php

namespace Tests;

use App\Models\Product;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Settings rolled back by DatabaseTransactions must not leak a memoised threshold.
        Product::flushDefaultMinStock();
    }
}
