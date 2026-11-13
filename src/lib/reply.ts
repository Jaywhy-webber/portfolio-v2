/**
 * Layout for the chat's replies. Pure, so it can be tested without a DOM.
 */

/**
 * End of a sentence: its punctuation, any closing quote or bracket, and any
 * [/route] citations the model put after the full stop rather than before it.
 * A full stop after a common abbreviation, or after a lone capital as in
 * "U.S." or "Jerome Y. Yeoh", ends nothing.
 */
const LATIN_END = /((?<!\b(?:e\.g|i\.e|vs|cf|approx|Dr|Mr|Mrs|Ms|St|[A-Z]))[.!?]["')\]]*(?:\s*\[\/[^\]\s]*\])*)[ \t]+(?=[^\sa-z[])/g;

/** Chinese and Japanese full stops take no space before the next sentence. */
const CJK_END = /([。！？](?:\s*\[\/[^\]\s]*\])*)[ \t]*(?=[^\s。！？」』）[])/g;

/**
 * Puts each sentence of a reply on its own line, so a three-sentence answer
 * reads as three short lines rather than one block. Line breaks the model
 * wrote itself are kept as they are.
 *
 * A sentence ends at punctuation followed by a space and then anything but a
 * lowercase letter, so "a GPA of 4.63 out of 5.0" and "e.g. the kart" stay
 * whole. A citation after the full stop stays on its sentence's line rather
 * than starting the next one. Text still streaming in is safe to pass: the
 * space after a full stop only turns into a line break once the next sentence
 * has started.
 */
export function sentenceLines(text: string): string {
  return text.replace(LATIN_END, "$1\n").replace(CJK_END, "$1\n");
}

/** A [/route] citation, with the space before it. */
const CITATION = /[ \t]*\[(\/[^\]]*)\]/g;

/** A citation still streaming in at the end of the text: "[" or "[/proj". */
const PARTIAL_CITATION = /[ \t]*\[(\/[^\]]*)?$/;

/**
 * Takes the [/route] citations out of a reply, so they can be listed once
 * under it instead of breaking up the sentences. Returns the text without
 * them and the routes cited, in order of first mention and each once.
 *
 * Only routes in `known` are kept. The model invents descriptive paths, such
 * as "/about-jerome-yeoh/" for the profile at "/", and those would link to a
 * 404; they are still removed from the text. It also lists several routes in
 * one bracket, as "[/work, /research#databusters]", and pulls the sentence's
 * full stop inside, as "[/.]", so each bracket is split and trimmed first.
 */
export function splitCitations(text: string, known: Record<string, string>): { text: string; routes: string[] } {
  const routes = new Set<string>();
  const stripped = text
    .replace(CITATION, (_, inner: string) => {
      for (const part of inner.split(/[,\s]+/)) {
        const route = part.replace(/[.,;:]+$/, "");
        if (Object.hasOwn(known, route)) routes.add(route);
      }
      return "";
    })
    .replace(PARTIAL_CITATION, "");
  return { text: stripped, routes: [...routes] };
}
