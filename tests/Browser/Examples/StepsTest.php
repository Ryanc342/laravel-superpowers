<?php

use App\Models\User;

/*
 * The step-by-step form example in a browser: the server checks each step's
 * fields before the next step shows, and the last step sends the supplier.
 */

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

/** The step that shows. The others stay in the page, hidden. */
const SHOWN_SUPPLIER_STEP = '.ant-pro-steps-form-step-active';

test('Next with no company stays on the company step, with the error under the field', function () {
    visit('/examples/steps')
        ->assertVisible('input#company_company_name')
        ->press('Next')
        ->assertSeeIn(SHOWN_SUPPLIER_STEP.' .ant-form-item-explain-error', 'The company name field is required.')
        ->assertVisible('input#company_company_name')
        ->assertMissing('input#contact_contact_name')
        ->assertNoJavaScriptErrors();
});

test('each filled-in step moves on, and the last one sends the supplier to its result', function () {
    visit('/examples/steps')
        ->type('input#company_company_name', 'Acme Ltd')
        ->click(SHOWN_SUPPLIER_STEP.' .ant-select')
        ->click('.ant-select-item-option[title="Retail"]')
        ->press('Next')
        ->assertVisible('input#contact_contact_name')
        ->assertMissing('input#company_company_name')
        ->type('input#contact_contact_name', 'Wang Fang')
        ->type('input#contact_email', 'wang.fang@example.com')
        ->press('Next')
        ->assertSeeIn(SHOWN_SUPPLIER_STEP, 'Acme Ltd')
        ->assertSeeIn(SHOWN_SUPPLIER_STEP, 'Retail')
        ->assertSeeIn(SHOWN_SUPPLIER_STEP, 'wang.fang@example.com')
        ->press('Finish')
        ->assertPathIs('/examples/result/success')
        ->assertSee('Supplier added')
        ->assertNoJavaScriptErrors();
});

test('an error the send finds in an earlier step takes the user back to that step, with the error under its field', function () {
    // The server asks whether the company is a supplier already on the send only, not on the step's check.
    visit('/examples/steps')
        ->type('input#company_company_name', 'Taken Ltd')
        ->click(SHOWN_SUPPLIER_STEP.' .ant-select')
        ->click('.ant-select-item-option[title="Retail"]')
        ->press('Next')
        ->type('input#contact_contact_name', 'Wang Fang')
        ->type('input#contact_email', 'wang.fang@example.com')
        ->press('Next')
        ->assertSeeIn(SHOWN_SUPPLIER_STEP, 'Taken Ltd')
        ->press('Finish')
        ->assertSeeIn(SHOWN_SUPPLIER_STEP.' .ant-form-item-explain-error', 'This company is a supplier already.')
        ->assertVisible('input#company_company_name')
        ->assertPathIs('/examples/steps')
        ->assertNoJavaScriptErrors();
});

test('the steps form leaves checking to the server', function () {
    visit('/examples/steps')
        ->assertPresent('input#company_company_name')
        ->assertScript("[...document.querySelectorAll('.ant-pro-steps-form form')].every((form) => form.noValidate)", true);
});
