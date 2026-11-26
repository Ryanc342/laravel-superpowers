<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * The step-by-step form example: a new supplier, in three steps. The server
 * checks each step's fields before the next (Precognition, `only` those
 * fields), and the whole supplier when it is sent.
 */

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

/**
 * A supplier as the form sends it after its last step.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function exampleSupplierInput(array $overrides = []): array
{
    return [
        'company_name' => 'Acme Ltd',
        'industry' => 'retail',
        'website' => null,
        'contact_name' => 'Wang Fang',
        'email' => 'wang.fang@example.com',
        'phone' => null,
        ...$overrides,
    ];
}

test('the form opens empty', function () {
    $this->get(route('examples.steps.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('examples/steps'));
});

test('the check of the first step asks only about its fields', function () {
    $this->withPrecognition()
        ->withHeader('Precognition-Validate-Only', 'company_name,industry,website')
        ->postJson(route('examples.steps.store'), exampleSupplierInput(['company_name' => '', 'contact_name' => '']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['company_name' => 'The company name field is required.'])
        ->assertJsonMissingValidationErrors(['contact_name', 'industry']);
});

test('an industry that is not one of the choices is refused', function () {
    $this->post(route('examples.steps.store'), exampleSupplierInput(['industry' => 'mining']))
        ->assertSessionHasErrors(['industry' => 'The selected industry is invalid.']);
});

test('an empty supplier is refused, with a message for each field it needs', function () {
    $this->post(route('examples.steps.store'), [])
        ->assertSessionHasErrors(['company_name', 'industry', 'contact_name', 'email'])
        ->assertSessionDoesntHaveErrors(['website', 'phone']);
});

test('a complete supplier goes to the success result', function () {
    $this->post(route('examples.steps.store'), exampleSupplierInput())
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('examples.result.show', ['status' => 'success']));
});
