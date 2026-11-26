<?php

namespace App\Enums;

use Illuminate\Support\Facades\Lang;

/**
 * The two languages of the app. Which one a request uses is decided here,
 * once: the signed-in user's saved choice, then the `locale` cookie, then
 * `config('app.locale')`. The browser's own language is never consulted.
 */
enum Locale: string
{
    case ZhCn = 'zh_CN';
    case En = 'en';

    /**
     * Business rule: the first source that holds a known language wins. An
     * unknown or malformed value is skipped, not an error. When no source
     * holds one, the configured default applies, and Chinese when that is not
     * a known language either.
     */
    public static function resolve(?string $saved, ?string $cookie): self
    {
        foreach ([$saved, $cookie] as $candidate) {
            if ($candidate !== null && self::tryFrom($candidate) !== null) {
                return self::from($candidate);
            }
        }

        return self::tryFrom((string) config('app.locale')) ?? self::ZhCn;
    }

    /**
     * The language the application is running in now, which SetLocale set.
     */
    public static function current(): self
    {
        return self::tryFrom(app()->getLocale()) ?? self::ZhCn;
    }

    /**
     * The language written in itself, so a reader who cannot read the current
     * language can still find theirs. These are names, not sentences: they are
     * not translated.
     */
    public function label(): string
    {
        return match ($this) {
            self::ZhCn => '中文',
            self::En => 'English',
        };
    }

    /**
     * The choices the language switch shows, from the one list the endpoint
     * accepts.
     *
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $locale): array => ['value' => $locale->value, 'label' => $locale->label()],
            self::cases(),
        );
    }

    /**
     * The sentences React translates with t(): the language's JSON files.
     * English has none, because every sentence is its own English text.
     *
     * @return array<string, string>
     */
    public function sentences(): array
    {
        if ($this === self::En) {
            return [];
        }

        return Lang::getLoader()->load($this->value, '*', '*');
    }
}
