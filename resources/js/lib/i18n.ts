/**
 * Every sentence a user reads goes through `t()` or `tChoice()`. A sentence
 * is keyed by its English text, so English needs no table: a sentence with no
 * translation is shown as it is. The server sends the current language's
 * sentences (`lang/template/zh_CN.json` and the project's own `lang/zh_CN.json`)
 * as the `translations` page prop, and the root layout hands them here before
 * the page renders.
 *
 * `:name` placeholders and the `a|b` plural syntax follow Laravel's, so a
 * sentence reads the same in PHP and in React.
 */
export type Replacements = Record<string, string | number>;

let language = 'en';
let strings: Record<string, string> = {};

/**
 * Called by the root layout on every render, with the page's `locale` and
 * `translations`. English has no sentences, and PHP sends its empty table as
 * `[]`, not `{}`: both mean "none".
 */
export function setLanguage(
    locale: string,
    translations: Record<string, string> | [] | undefined,
): void {
    language = locale;
    strings = !translations || Array.isArray(translations) ? {} : translations;
}

/** `en` or `zh_CN`: the language the page is in. */
export function currentLanguage(): string {
    return language;
}

/** Marks a sentence that is translated later, where it is shown: `t(item.title)`. */
export function msg(english: string): string {
    return english;
}

/** The translation of a sentence, if it has one. A name such as `constructor` is not one. */
function translationOf(key: string): string | undefined {
    const sentence = Object.hasOwn(strings, key) ? strings[key] : undefined;

    return typeof sentence === 'string' ? sentence : undefined;
}

function upperFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeForRegExp(text: string): string {
    return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Fills `:name`, `:Name` and `:NAME` the way Laravel's `makeReplacements` does:
 * in one pass, longer names first, so a value is never read as a placeholder
 * itself, and a value is put in as it is (`$&` is not a pattern).
 */
function fill(text: string, replace: Replacements): string {
    const replacements = new Map<string, string>();

    for (const [name, value] of Object.entries(replace)) {
        const replacement = String(value);

        replacements.set(`:${upperFirst(name)}`, upperFirst(replacement));
        replacements.set(`:${name.toUpperCase()}`, replacement.toUpperCase());
        replacements.set(`:${name}`, replacement);
    }

    if (replacements.size === 0) {
        return text;
    }

    const placeholders = [...replacements.keys()]
        .sort((a, b) => b.length - a.length)
        .map(escapeForRegExp)
        .join('|');

    return text.replaceAll(
        new RegExp(placeholders, 'g'),
        (placeholder) => replacements.get(placeholder) ?? placeholder,
    );
}

export function t(key: string, replace: Replacements = {}): string {
    return fill(translationOf(key) ?? key, replace);
}

/** `{1}`, `{1,3}` and `[2,*]`: the part of a plural form that says which counts it is for. */
const CONDITION = /^[{[]([^[\]{}]*)[}\]]/;

/** Laravel's `MessageSelector::testCondition`. */
function matchesCondition(condition: string, count: number): boolean {
    if (!condition.includes(',')) {
        return Number(condition) === count;
    }

    const [from, to] = condition.split(',', 2).map((bound) => bound.trim());

    return (
        (from === '*' || count >= Number(from)) &&
        (to === '*' || count <= Number(to))
    );
}

/**
 * Which plural form a count takes. English has "one" and "other". Chinese has
 * one form, which is also the case for a sentence with no translation on a
 * Chinese page: it reads in English, so it follows English's rule.
 */
function pluralIndex(count: number, isEnglish: boolean): number {
    return isEnglish ? (count === 1 ? 0 : 1) : 0;
}

/** `{0} none|{1} one task|[2,*] :count tasks`, or plain `one task|:count tasks`, like Laravel's trans_choice. */
function choose(line: string, count: number, isEnglish: boolean): string {
    const segments = line.split('|').map((segment) => segment.trim());

    for (const segment of segments) {
        const condition = CONDITION.exec(segment);

        if (condition && matchesCondition(condition[1], count)) {
            return segment.slice(condition[0].length).trim();
        }
    }

    const forms = segments.map((segment) =>
        segment.replace(CONDITION, '').trim(),
    );

    return forms[Math.min(pluralIndex(count, isEnglish), forms.length - 1)];
}

export function tChoice(
    key: string,
    count: number,
    replace: Replacements = {},
): string {
    const translation = translationOf(key);
    const line = choose(
        translation ?? key,
        count,
        translation === undefined || language === 'en',
    );

    // As trans_choice: the count goes after the other replacements, unless
    // the caller gives one.
    return fill(
        line,
        Object.hasOwn(replace, 'count') ? replace : { ...replace, count },
    );
}
