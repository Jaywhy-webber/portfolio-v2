# EC1101 Course Material Chatbot

A retrieval-augmented Q&A chatbot built over one NUS economics module's lecture slides, tutorial problem sets, and solutions. Ask it a question and it answers strictly from the course material, cites the exact page or paragraph it pulled the answer from, and says so plainly when a question isn't covered by the material rather than guessing.

That refusal behavior is the actual point of the project. It's a small-scale version of a problem that shows up anywhere an AI system answers questions from a fixed set of documents: a bank's terms and conditions, an HR policy handbook, a government agency's public FAQs. The failure mode to avoid in all of those cases is the same one this project targets: a confident, cited answer has to trace back to a real source, and "I don't know" has to be an answer the system will actually give.

## What it does

Ask a question in the chat interface. The system embeds the question, pulls the most relevant passages from the course material, and asks a Llama model to answer using only those passages, with a citation after every claim. If the retrieved passages don't actually contain the answer, it says the material doesn't cover it instead of falling back on the model's general knowledge.

Example:

> **Q: What is comparative advantage?**
> Comparative advantage refers to the ability to produce a good at a lower opportunity cost than another producer [Lecture 1.pdf, p.77-81]. When each country specializes in the good in which it has a comparative advantage, total production in all countries is higher, and all countries can gain from trade [Lecture 1.pdf, p.77-81]...

> **Q: What is the capital of France?**
> Not covered in the material.

## How the data gets processed

This is the part most write-ups skip, and it's where most of the actual engineering decisions live.

**1. Extraction.** The raw material is 26 files: 12 lecture PDFs, 10 tutorial documents (a mix of PDF and Word), and 4 solution PDFs. PDFs are parsed page by page with `pdfplumber`; Word documents are parsed paragraph by paragraph (and table by table) with `python-docx`, walking the document body directly rather than using `python-docx`'s default paragraph iterator, since that default silently skips tables. Every extracted block keeps its page number or paragraph number attached, along with which folder it came from (lecture slides vs. tutorial vs. official solutions), so a citation can always point back to a specific spot in a specific file. Office's temporary lock files (the `~$` files that appear when a Word doc is open) get filtered out during the folder walk.

**2. Chunking.** Extracted blocks are small and uneven (a lecture slide might be 40 words, a tutorial paragraph might be 10), so none of them are directly usable as a retrieval unit on their own. Chunks are built by flattening each document into a single word stream and sliding a window across it, merging as many blocks as needed to hit a target size, with a 30-word overlap between consecutive chunks so an idea that spans a chunk boundary doesn't get cut in half. Table content never gets merged into the surrounding window; a table gets its own chunk, since splitting its rows across a boundary would break the relationship between a row's cells and the row itself.

The chunk size itself is smaller than what's typical for this kind of project, around 200 words rather than the more common 300-500, because the embedding model used here (`all-MiniLM-L6-v2`) truncates anything past 256 tokens. A 400-500 word chunk of dense economics text would have had roughly half its content silently ignored at embedding time, while the model would still cite the full chunk as if it had read all of it. Catching that before it became a hidden accuracy problem, rather than after eval numbers came in low for no obvious reason, is what drove the smaller chunk size.

**3. Embedding and storage.** Each chunk is embedded with `all-MiniLM-L6-v2` (free, runs locally, no API calls) and stored in a local Chroma vector database, indexed with cosine distance to match how the embedding model was trained. Metadata (source file, page or paragraph range, category, word count) travels with each vector, so a retrieval result comes back with everything needed to build a citation without a second lookup.

**4. Retrieval.** A question gets embedded the same way the chunks were, and Chroma returns the nearest chunks by cosine similarity. Each result carries a similarity score and a formatted citation string (page range for PDFs, paragraph range for Word documents).

**5. Generation and refusal.** The question and its retrieved chunks go to a Llama 3.3 70B model via Groq, under a system prompt that requires every claim to be cited and instructs the model to say the material doesn't cover something rather than answer from general knowledge. Refusal happens two ways. If the best similarity score doesn't clear a threshold, the system refuses before ever calling the model, which is cheaper and also removes the chance of an LLM getting talked into using weak context. If the retrieved chunks look topically related but don't actually answer the question, the model is expected to catch that itself and refuse anyway. Both paths were tested directly: a question about Singapore's 2023 inflation policy retrieves real, topically close macroeconomics content (similarity high enough to pass the first check) but gets refused anyway, because the material covers the general concept and not that specific case.

This is the exact system prompt sent with every question (`src/generation.py`):

```
You are a study assistant for the EC1101 module. Answer the
question using ONLY the excerpts provided below.

- Every claim in your answer must be supported by an excerpt. Cite the excerpt
  immediately after the claim it supports, using its citation exactly as given
  (e.g. "[Macro 3.pdf, p.5-7]").
- If the excerpts do not contain enough information to answer the question,
  respond with exactly: "Not covered in the material." -- do not answer from
  general knowledge, even if you know the answer.
- Do not use any information beyond what is in the excerpts.
```

The refusal string is defined once as a constant and reused both inside this prompt and in the code that checks whether the model actually refused, so the instruction text and the detection logic can't quietly drift apart from each other.

**6. Interface.** A Streamlit chat app wraps the pipeline: a sidebar to adjust how many chunks get retrieved and to restrict retrieval to one category of material, chat history for the session, and every answer shown with its sources in a collapsible section underneath.

**7. Evaluation.** Fourteen questions were built against the actual corpus: eight sourced directly from the tutorial solution PDFs (with keywords copied verbatim from the extracted text, not invented), three reused from manual testing earlier in the build, and three designed to test refusal, including the deliberately hard case described above. Each question ran at three different retrieval settings to pick the best one empirically rather than by guessing, checking three things per question: did retrieval find the right source document, did the generated answer contain the expected facts, and did the system refuse exactly when it was supposed to.

At the setting that performed best (retrieving 5 chunks per question), all three checks came back at 100%: 11 out of 11 answerable questions retrieved the correct source and produced an answer containing the expected facts, and all 3 refusal questions were refused correctly. The two cases where automated keyword matching flagged a partial miss were checked by hand and turned out to be correct answers phrased differently than the exact keyword.

## Guardrails and verification

There's no separate `pytest` suite here. Verification happens two ways instead: checks built into the pipeline that fail loudly rather than quietly producing bad data, and `src/eval.py`, which functions as the real test suite for the part that actually matters, whether the bot answers correctly and refuses correctly.

Refusal runs through two independent layers. A similarity threshold of 0.25 blocks obviously irrelevant questions before the system ever calls the Groq API, which is cheaper and also means a weak match doesn't talk the model into fabricating an answer from thin context. Anything that clears that bar still has to pass the system prompt's own instruction to refuse when the excerpts don't actually contain the answer. That second layer is what catches the harder case: a question that scores well on similarity because it's topically close, but isn't actually covered by the material retrieved.

The extraction step stops a bad file from taking down the whole run. `corpus_prep.py` wraps each source file's extraction in its own error handler, so a single malformed PDF or corrupted Word doc gets logged to the run's manifest and skipped instead of crashing partway through all 26 files.

Embedding checks its own work too. After chunks are loaded into Chroma, the pipeline asserts that the stored vector count matches what was sent, then pulls a sample of stored chunks back out and compares their text and metadata against the originals word for word. If anything doesn't match, it raises immediately rather than leaving a silently corrupted vector store behind. The whole collection also gets rebuilt from scratch on every run rather than updated in place.

The eval questions themselves are grounded in the real corpus rather than made up for the occasion. Eight of the fourteen came from reading the actual extracted text in the tutorial solution PDFs and pulling exact facts and figures out of it, so the expected answers exist because they were checked against the source material. The two "partial miss" results the automated scoring flagged were read against that same source text before being counted as passes.

## Tech stack

| Layer | Tool |
|---|---|
| PDF / Word extraction | pdfplumber, python-docx |
| Chunking | custom word-level splitter |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2), local |
| Vector store | Chroma, local, cosine distance |
| Generation | Llama 3.3 70B via Groq |
| UI | Streamlit |
| Eval | custom question set + scoring script |

## Project structure

```
data/raw/EC1101/    original PDFs and Word docs (git-ignored, likely copyrighted)
data/processed/     corpus.jsonl, chunks.jsonl, and manifests from each pipeline stage
chroma_db/          local vector store (git-ignored)
eval/               questions.json + eval results/report
src/
  corpus_prep.py    PDF/docx extraction
  chunking.py       word-level chunking
  embed_store.py    embedding + Chroma loading
  retrieval.py      query-time retrieval
  generation.py     Groq prompting + refusal logic
  eval.py           eval runner
app.py              Streamlit UI
```

## Running it

```bash
pip install -r requirements.txt
cp .env.example .env   # add your GROQ_API_KEY

python -m src.corpus_prep
python -m src.chunking
python -m src.embed_store
streamlit run app.py
```

To reproduce the eval numbers above:

```bash
python -m src.eval
```

## Scope

Text-based Q&A only. Every answer either cites a specific page or paragraph, or states that the material doesn't cover it. There's no middle case where it answers without a source.
