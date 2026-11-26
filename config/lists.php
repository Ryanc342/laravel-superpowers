<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Rows Per Page
    |--------------------------------------------------------------------------
    |
    | The choices a list offers for how many rows a page shows, and the number
    | it shows when the URL names none. App\Http\Requests\ListRequest validates
    | `per_page` against the choices, and the page-size menu under the list is
    | filled from the same array, so the two cannot differ.
    |
    */

    'per_page_options' => [10, 20, 50, 100],

    'per_page' => 20,

];
