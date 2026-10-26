<div align="center">

<img src="docs/thumbnail.png" alt="Ghostlisted" width="100%">

# 👻 Ghostlisted

### Before you apply, find out if anyone's really hiring.

Paste a job post or upload one or two screenshots, in English or Bengali.<br>
Ghostlisted highlights the exact lines that signal a **scam**, a **ghost job**, or a **"fresher" role that really wants a senior**.

<br>

[![Live demo](https://img.shields.io/badge/Live_demo-ghostlisted.vercel.app-1b1b1b?style=for-the-badge&logo=vercel&logoColor=white)](https://ghostlisted.vercel.app)
[![Demo video](https://img.shields.io/badge/Demo_video-YouTube-c0392b?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/BA72RINlw48)

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-F55036?style=flat-square)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white)
![Tests](https://img.shields.io/badge/tests-17_passing-2f7a4f?style=flat-square&logo=vitest&logoColor=white)

</div>

---

## 🎬 Watch the demo

<div align="center">

[![Watch the Ghostlisted demo on YouTube](https://img.youtube.com/vi/BA72RINlw48/maxresdefault.jpg)](https://youtu.be/BA72RINlw48)

*2:52 · from a real story to a live check of a sample, a pasted post, and a screenshot*

</div>

---

## 🆕 What's new since the Will It Ship review

At the live **Will It Ship** review, the judges liked the design and the lane colors, and pointed out that long job posts don't fit in one screenshot. Since then:

- 🖼️ **Up to two screenshots per check**, read in order. Lines that appear in both are counted once.
- 🧹 **No repeated lines across lanes.** A line that fits two lanes is kept only in the most serious one (Scam → Fresher mismatch → Ghost).
- 🇧🇩 **A Bengali sample post** in "Try a sample", so Bengali support can be seen in one click.

*The demo video was recorded before these changes. They are all live on the site.*

---

## 💔 Why I built it

> I graduated a few months ago, and I'm still looking for my first job.
>
> I applied to a fresher trainee program at a big company. Five seats. A clear deadline.
> Then nothing, for over a month. Later I found out they had hired one senior engineer instead.
>
> The warning signs were in that post. I just didn't know how to read them.

---

## 🔍 What it checks

| | Lane | What it looks for |
|:---:|---|---|
| ![](https://img.shields.io/badge/%20-%20-e5484d?style=flat-square) | **Scam signals** | Fees or deposits, ID or bank details before any interview, Telegram-only contact, pay that's too good to be true |
| ![](https://img.shields.io/badge/%20-%20-f5c400?style=flat-square) | **Ghost signals** | "Open until filled", talent-pool language, vague duties, no salary, invitations to reapply, months-old reposts |
| ![](https://img.shields.io/badge/%20-%20-2f6fdb?style=flat-square) | **Fresher mismatch** | A post labeled fresher, trainee, or entry level that asks for years of experience or team leadership |

Every signal **quotes the exact line** from the post and highlights it in place. Then you get one move — **Apply**, **Verify first**, or **Skip** — with two or three concrete checks to run before you apply.

> **Signals, not verdicts.** Ghostlisted never says a post "is fake". A post can't prove what a company decided internally, so it shows the evidence and lets you decide.

---

## 📸 Screenshots

<table>
  <tr>
    <td width="50%"><img src="docs/input.png" alt="Input screen"><br><sub><b>1.</b> Paste a post, upload one or two screenshots, or try a fictional sample.</sub></td>
    <td width="50%"><img src="docs/report.png" alt="Report"><br><sub><b>2.</b> One recommended move, with every flagged line highlighted.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/lanes.png" alt="Signal lanes"><br><sub><b>3.</b> Each signal quotes the post. "From your answers" uses your context.</sub></td>
    <td width="50%" align="center"><img src="docs/mobile.png" alt="Mobile view" width="60%"><br><sub><b>4.</b> On mobile, the recommended move comes first.</sub></td>
  </tr>
</table>

---

## 🛡️ How it keeps the AI honest

I come from a security background, so the model never gets the last word.

```mermaid
flowchart LR
    A["Job post<br/>text or screenshot"] --> B["Groq model<br/>JSON schema output"]
    B --> C["Zod validation<br/>retry once"]
    C --> D["Quote check<br/>against the post"]
    D --> E["Next-move rules<br/>in plain code"]
    E --> F["Report"]
```

- ✅ **Validated output** — every reply is checked with Zod; an invalid one is retried once, then shown as an error.
- ✂️ **No invented quotes** — on the server, each quote is matched against the post (ignoring only whitespace and case). Anything that isn't really there is dropped before it reaches the browser.
- 🧹 **One lane per line** — if the model puts the same quote in two lanes, the server keeps it only in the most serious one.
- ⚖️ **Rules decide** — Skip if Scam is High, Verify first if any lane is Medium or High, otherwise Apply.
- 🔒 **Untrusted input** — the post is treated as data, and instructions hidden inside it are ignored.
- 🧪 **Tested** — 17 unit tests cover quote validation, duplicate removal, highlight mapping, and the next-move rules.

---

## ⚙️ Built with

**Next.js** (App Router) · **TypeScript** · **Tailwind CSS v4** · **Groq** (`qwen/qwen3.8-27b` for text and images, plus a text-only fallback model) · **Zod** · **Vitest** · **Vercel**

<details>
<summary><b>Project structure</b></summary>

```
src/
  app/        page, layout, and the POST /api/analyze route
  client/     UI components and browser-side image resizing
  server/     Groq call and prompt (server-only)
  shared/     schemas, quote validation, highlight mapping, sample data
tests/        unit tests
devpost/      planning docs from the Devpost Learn skill pack
```

</details>

---

## 💻 Run it locally

You don't need to run it to try it — the live app is at **https://ghostlisted.vercel.app**.

<details>
<summary><b>Setup steps</b></summary>

Requires Node.js 20 or newer and a free Groq API key from https://console.groq.com/keys.

```bash
git clone https://github.com/ShArafat58/ghostlisted.git
cd ghostlisted
npm install
cp .env.example .env.local   # then add your Groq key and model IDs
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm test                 # unit tests
npm run typecheck        # TypeScript check
npm run capture:samples  # refresh the saved sample results (dev server must be running)
```

</details>

---

## 🗺️ How it was planned

Built for the Devpost **Build With AI: Basics** hackathon, planned before any code with the Devpost Learn Skill Pack:

**[Scope](devpost/scope.md)** → **[PRD](devpost/prd.md)** → **[Spec](devpost/spec.md)** → **[Build checklist](devpost/checklist.md)**

---

## ⚠️ Limitations

- Reading screenshots with AI can introduce small errors, especially in unfamiliar names. The app says so and asks you to compare with your image.
- A check takes at most two screenshots. Groq's free tier allows 8,000 tokens per minute and each image uses about 2,000, so two is the most that fits with the prompt and the reply.
- Signals are hints, not proof. Always confirm with the company directly.
- It runs on Groq's free tier, so heavy use can hit rate limits. The built-in samples fall back to a clearly labeled saved result from a real run.
- All companies and posts in the samples and demo are fictional.

<div align="center">
<br>

**Shortlisted, or ghostlisted? Now you'll know before you apply.**

</div>
