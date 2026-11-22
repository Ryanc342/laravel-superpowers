<?php

/*
 * Pest's built-in architecture presets: no debugging leftovers (dd, dump,
 * var_dump, ray), no unsafe functions (eval, exec, md5, unserialize), and
 * the Laravel conventions for where classes live and how they are named.
 */

arch()->preset()->php();

arch()->preset()->security();

arch()->preset()->laravel();
