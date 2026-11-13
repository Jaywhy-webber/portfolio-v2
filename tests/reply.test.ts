import { readFileSync } from "node:fs";
import { describe, test, expect } from "vitest";
import { sentenceLines, splitCitations } from "../src/lib/reply";

describe("sentenceLines", () => {
  test("puts each sentence of a reply on its own line", () => {
    // A real reply that read as one block in the bubble.
    const reply =
      "Jerome is a Business Analytics student at NUS, currently an Analyst Intern at the Prime Minister's Office [/]. " +
      "He has built a RAG chatbot and a go-kart telemetry dashboard [/projects/ec1101-rag-chatbot/] [/projects/kart-telemetry/]. " +
      "Ask me about his agentic coding workflow.";
    expect(sentenceLines(reply).split("\n")).toEqual([
      "Jerome is a Business Analytics student at NUS, currently an Analyst Intern at the Prime Minister's Office [/].",
      "He has built a RAG chatbot and a go-kart telemetry dashboard [/projects/ec1101-rag-chatbot/] [/projects/kart-telemetry/].",
      "Ask me about his agentic coding workflow.",
    ]);
  });

  test("breaks after questions and exclamations too", () => {
    expect(sentenceLines("Mrrp! That's outside my patch. Want to hear about his kart project?")).toBe(
      "Mrrp!\nThat's outside my patch.\nWant to hear about his kart project?",
    );
  });

  test("does not break inside numbers or abbreviations", () => {
    expect(sentenceLines("He has a GPA of 4.63 out of 5.0 [/work].")).toBe("He has a GPA of 4.63 out of 5.0 [/work].");
    expect(sentenceLines("It uses tools, e.g. Pandas and Plotly.")).toBe("It uses tools, e.g. Pandas and Plotly.");
    expect(sentenceLines("Python vs. R is not on the site.")).toBe("Python vs. R is not on the site.");
    expect(sentenceLines("Data from the U.S. Census helped.")).toBe("Data from the U.S. Census helped.");
  });

  test("a citation after the full stop stays with its sentence", () => {
    expect(sentenceLines("He built a dashboard. [/projects/kart-telemetry/] Ask me how.")).toBe(
      "He built a dashboard. [/projects/kart-telemetry/]\nAsk me how.",
    );
    // At the very end, it is not pushed onto a line of its own.
    expect(sentenceLines("He built a dashboard. [/projects/kart-telemetry/]")).toBe(
      "He built a dashboard. [/projects/kart-telemetry/]",
    );
  });

  test("breaks a sentence that opens with a digit or a quote", () => {
    expect(sentenceLines('He graduates in 2029. "Gem score" is his metric.')).toBe(
      'He graduates in 2029.\n"Gem score" is his metric.',
    );
  });

  test("splits Chinese at its own full stops, which take no space", () => {
    expect(sentenceLines("Jerome 在新加坡国立大学读书 [/]。想了解他的研究项目吗？")).toBe(
      "Jerome 在新加坡国立大学读书 [/]。\n想了解他的研究项目吗？",
    );
  });

  test("keeps line breaks the model wrote, without adding more", () => {
    const reply = "He built a dashboard [/projects/kart-telemetry/].\n\nAsk me how.";
    expect(sentenceLines(reply)).toBe(reply);
  });

  test("is safe to run on text still streaming in", () => {
    // The trailing space waits until the next sentence arrives.
    expect(sentenceLines("He built a dashboard. ")).toBe("He built a dashboard. ");
    expect(sentenceLines("He built a dashboard. A")).toBe("He built a dashboard.\nA");
  });

  test("running it twice changes nothing more", () => {
    const once = sentenceLines("One. Two! Three?");
    expect(sentenceLines(once)).toBe(once);
  });
});

describe("splitCitations", () => {
  const known = {
    "/": "Profile",
    "/work": "Work",
    "/projects/kart-telemetry/": "Kart Telemetry Dashboard",
    "/research#databusters": "Financial Run Dynamics",
  };

  test("takes citations out of the sentences and lists the pages once, in order", () => {
    const reply =
      "He studies at NUS [/]. He interns at the PMO [/work]. He built a kart dashboard [/projects/kart-telemetry/] [/work].";
    expect(splitCitations(reply, known)).toEqual({
      text: "He studies at NUS. He interns at the PMO. He built a kart dashboard.",
      routes: ["/", "/work", "/projects/kart-telemetry/"],
    });
  });

  test("keeps anchored routes, which research and READMEs are cited by", () => {
    expect(splitCitations("He modelled bank runs [/research#databusters].", known).routes).toEqual([
      "/research#databusters",
    ]);
  });

  test("drops routes the site doesn't have, from the text and from the list", () => {
    // Seen live: an invented descriptive path for the profile.
    expect(splitCitations("He studies at NUS [/about-jerome-yeoh/].", known)).toEqual({
      text: "He studies at NUS.",
      routes: [],
    });
  });

  test("splits a bracket listing several routes, by comma or space", () => {
    // Seen live, despite the prompt asking for one route per bracket.
    expect(splitCitations("Projects [/work, /projects/kart-telemetry/].", known).routes).toEqual([
      "/work",
      "/projects/kart-telemetry/",
    ]);
    expect(splitCitations("Projects [/work /].", known).routes).toEqual(["/work", "/"]);
  });

  test("keeps a citation whose bracket swallowed the full stop", () => {
    // Seen live: "[/.]" for the profile.
    expect(splitCitations("He studies at NUS [/.]", known).routes).toEqual(["/"]);
  });

  test("hides a citation still streaming in", () => {
    expect(splitCitations("He interns at the PMO [/wo", known).text).toBe("He interns at the PMO");
    expect(splitCitations("He interns at the PMO [", known).text).toBe("He interns at the PMO");
  });

  test("leaves brackets that are not citations alone", () => {
    expect(splitCitations("Scores [0-1] are blended.", known).text).toBe("Scores [0-1] are blended.");
  });

  test("does not mistake a built-in object key for a page", () => {
    expect(splitCitations("See [/constructor].", known).routes).toEqual([]);
  });

  test("a reply with no citations is unchanged", () => {
    expect(splitCitations("The site doesn't cover that.", known)).toEqual({
      text: "The site doesn't cover that.",
      routes: [],
    });
  });
});

describe("chat widget", () => {
  const widget = readFileSync("src/components/ChatWidget.astro", "utf8");

  test("lays out replies one sentence a line, while they stream and once restored", () => {
    expect(widget).toContain("el.textContent = sentenceLines(text.trim());");
    expect(widget).toContain("showReply(reply, answer);");
    // The visitor's own words are shown as typed.
    expect(widget).toContain('if (turn.role === "user") bubble("user", turn.content);');
  });
});
