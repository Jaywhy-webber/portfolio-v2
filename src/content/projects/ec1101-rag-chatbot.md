---
title: EC1101 Course Material Chatbot
summary: Retrieval-augmented Q&A chatbot over an NUS economics module's course material that answers strictly from the source documents, cites the exact page or paragraph, and says plainly when a question isn't covered.
stack:
  - Python
  - Chroma
  - Groq / Llama 3.3
  - Streamlit
sortOrder: 4
preview:
  kind: animated-screenshot
  assetPath: /assets/posters/ec1101-rag-chatbot.png
  posterPath: /assets/posters/ec1101-rag-chatbot.png
demo:
  kind: none
repoUrl: https://github.com/Jaywhy-webber/EC1101-RAG-Chatbot
---

## Problem

An AI system answering questions from a fixed set of documents has the job to ensure that the cited answer traces back to a real source within the given content, and "I don't know" has to be a genuine option, instead of it being a fallback the model avoids. Most small RAG demos get the retrieval and generation working and skip the refusal case entirely. That's the part that is important if the the same system is used to reference a bank's terms and conditions or an HR policy handbook.

## Approach

Built a chatbot over one NUS economics module's course material, with 26 source documents in total: 12 lecture PDFs, 10 tutorial documents split between PDF and Word, and 4 solution PDFs. PDFs are parsed page by page with `pdfplumber`, and Word documents are walked through each paragraph and table with `python-docx`, since its default iterator skips tables. Every extracted block keeps its page or paragraph number attached, ensuring that a citation can always point back to a specific spot in a specific file.

Chunks are built with a sliding window over each document's word stream, sized to around 200 words rather than the more typical 300-500, with a 30-word overlap so an idea spanning a chunk boundary doesn't get devided. Each chunk is embedded locally with `all-MiniLM-L6-v2` and stored in Chroma. At query time, the question is embedded the same way, Chroma returns the nearest chunks by cosine similarity, and a Llama 3.3 70B model via Groq answers using only those chunks, citing the page or paragraph range after every claim. A Streamlit chat interface wraps the whole thing, with retrieved sources shown under each answer.

## Hard Parts

Refusal takes into account two independent layers. A similarity threshold blocks obviously irrelevant questions before the system ever calls the model, which is cheaper and also stops a weak match from talking the model into fabricating an answer from weak context. The more problematic case is a question that scores well on similarity because it's topically close, but isn't actually answered by what got retrieved, like asking about Singapore's 2023 inflation policy against a general macroeconomics chunk on inflation. Only the second layer, the model refusing on its own instructions rather than the similarity score, catches that one, and it took testing to confirm it actually holds.

The chunk size came from a similar near-miss. `all-MiniLM-L6-v2` truncates anything past 256 tokens, so a standard 300-500 word chunk would have had roughly half its content silently dropped at embedding time, while the model would still cite the full chunk as though it had read all of it. Catching that before eval numbers came in low for no obvious reason meant sizing chunks around the embedding model's real limit instead of the size most write-ups default to.

## Outcome

Evaluated against 14 questions built from the actual corpus: 11 answerable questions sourced from tutorial solutions, and 3 designed to test refusal. At the best-performing retrieval setting, retrieval accuracy, answer accuracy, and refusal accuracy all came back at 100%, checked by hand against the source material rather than taken on faith from automated keyword matching.
