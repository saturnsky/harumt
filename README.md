# 하루 기계 번역기 (Haru Machine Translator, HaruMT)

[English](README.en.md)

**CPU만으로 동작하는 오픈소스 규칙 기반 일한(日韓) 번역기**

[![npm](https://img.shields.io/npm/v/harumt)](https://www.npmjs.com/package/harumt)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE.Apache)
[![Bundled data](https://img.shields.io/badge/bundled%20data-Apache--2.0%20%7C%20CC--BY--SA--4.0%20%7C%20Unicode--3.0-lightgrey)](#라이선스)

```ts
import { createTranslationPipeline } from "harumt";

const pipeline = await createTranslationPipeline();
await pipeline.translate("駅まで歩いて行きました。"); // → 역까지 걸어서 갔어요.
```

- [소개](#소개)
- [설치](#설치)
- [사용법](#사용법)
- [브라우저 · 웹 확장](#브라우저--웹-확장)
- [진단 CLI](#진단-cli)
- [개발 방식과 피드백](#개발-방식과-피드백)
- [감사의 말 · 라이선스](#감사의-말)
- [변경 이력](CHANGELOG.md)

---

## 소개

일본어와 한국어는 어순과 문법 구조가 많이 닮아 있어, 규칙 기반 기계 번역(RBMT)이 상대적으로 힘을 발휘하기 좋은 언어쌍입니다.
HaruMT는 여러 언어에 두루 쓰이는 범용 RBMT를 지향하지 않습니다. 대신 **일본어와 한국어 사이의 고유한 대응 관계**를 깊게 파고들어, 이 언어쌍에서 더 나은 번역 품질을 내는 것을 목표로 합니다.

### 왜 '하루'인가요?

어제의 세상에서는 이런 번역기를 개인이 만드는 것이 불가능했습니다.
내일의 세상은 LLM의 발전으로 RBMT가 더는 필요하지 않은 세상이 될 것입니다.
그래서 **지금 이 순간에만 살아 있을 수 있는 프로젝트**라는 뜻을 이름에 담았습니다.

### 이런 점이 좋습니다

- **CPU만으로 동작** — GPU나 외부 API 없이 번역합니다.
- **재현 가능한 결과** — 같은 버전과 같은 사전을 쓰면 언제나 같은 번역 결과가 나옵니다. 번역 결과를 고정해야 한다면 패키지 버전을 고정해서 쓰세요.
- **프라이버시** — 번역할 문장이 외부로 전송되지 않습니다.

### 이런 한계가 있습니다

- 문맥이나 뉘앙스를 깊이 이해하지 못합니다.
- 중의적인 표현을 잘못 번역하는 경우가 많습니다.
- 새로 등장한 단어나 표현에는 사전이 갱신되기 전까지 대응하기 어렵습니다.

위 한계는 규칙 기반이라는 방식에서 오는 것이라, 버전이 올라가도 사라지지 않습니다.
앞으로의 개선은 어휘와 문형을 하나씩 넓히는 점진적인 것이 될 것입니다.

### Google 번역과 견주면

LLM으로 만든 합성 문장 세트 167항목을 양쪽에 넣고, 어느 쪽 출력인지 가린 채 채점한 결과입니다 (HaruMT 0.1.0, Google 번역 2026-11-11 수집).

| OK를 받은 쪽 | 문법 단문 (127) | 웹소설·고유명·단락 (40) | 전체 (167) |
|---|---|---|---|
| 둘 다 | 54 | 3 | 57 |
| HaruMT만 | 28 | 3 | 31 |
| Google 번역만 | 10 | 8 | 18 |
| 둘 다 아님 | 35 | 26 | 61 |

이 세트에서는 문법이 분명한 한 문장에서 HaruMT가, 웹소설 문체·고유명·여러 문장이 이어지는 글에서 Google 번역이 OK를 더 많이 받았습니다. 뒤쪽 범주에서는 양쪽 모두 대부분의 항목에서 OK를 받지 못했습니다.
채점은 LLM이 한 번 판정한 것이고 비교 대상도 하나뿐이니 참고 자료로 보아 주세요. 전체 문장과 양쪽 출력, 채점 기준은 [COMPARISON.md](https://github.com/saturnsky/harumt/blob/main/COMPARISON.md)에 있습니다.

---

## 설치

> **요구 사항**: Node.js 22 이상

```bash
npm install harumt
npx harumt-fetch-dictionary
```

시스템 사전(약 300MB)은 용량이 커서 npm 패키지와 별도로 배포됩니다.
`npx harumt-fetch-dictionary`를 실행하면 [HaruMT GitHub 저장소](https://github.com/saturnsky/harumt)의 Release에서 사전을 내려받아 설치합니다.

사전은 패키지 폴더가 아닌 사용자 데이터 디렉터리에 저장되므로, 패키지를 업데이트하거나 다시 설치해도 유지됩니다.

| OS | 저장 위치 |
|----|-----------|
| Linux | `$XDG_DATA_HOME/harumt/dict/` (기본 `~/.local/share/harumt/dict/`) |
| macOS | `~/Library/Application Support/harumt/dict/` |
| Windows | `%LOCALAPPDATA%\harumt\dict\` |

| 옵션 | 설명 |
|------|------|
| `--out <dir>` | 기본 위치 대신 지정한 디렉터리에 설치 (파이프라인에는 `systemDictPath`로 경로 지정) |
| `--from <dir>` | 미리 받아 둔 Release 자산(`*.gz`)으로 설치 (오프라인 환경용) |
| `--force` | 이미 같은 사전이 설치되어 있어도 다시 내려받아 설치 |

### 사전 삭제

사전은 패키지 밖에 있으므로 `npm uninstall harumt`로 패키지를 제거해도 지워지지 않습니다.
더 이상 사용하지 않는다면 위 저장 위치의 `harumt/` 디렉터리를 직접 삭제하세요.

사전이 갱신되면 새 버전은 `dict/` 아래 별도 디렉터리에 설치되고, 이전 버전은 그대로 남습니다.
설치할 때 이전 버전이 발견되면 안내 메시지가 출력됩니다. 다른 프로젝트에서 이전 버전의 HaruMT를 사용하고 있지 않다면 해당 디렉터리를 삭제해도 됩니다.

---

## 사용법

> **참고**
>
> 0.x 버전에서는 API가 버전마다 달라질 수 있습니다. 바뀐 내용은 [변경 이력](CHANGELOG.md)에 적습니다.

### 기본

```ts
import { createTranslationPipeline } from "harumt";

const pipeline = await createTranslationPipeline();
console.log(await pipeline.translate("駅まで歩いて行きました。"));
// 역까지 걸어서 갔어요.

const formal = await createTranslationPipeline({ register: "formal" });
console.log(await formal.translate("駅まで歩いて行きました。"));
// 역까지 걸어서 갔습니다.
```

> **참고**
>
> 파이프라인을 처음 만들 때는 사전 적재에 1초 남짓 걸립니다(사전 파일이 디스크 캐시에 없으면 더 걸립니다).
> 같은 옵션으로 다시 호출하면 이미 만들어 둔 파이프라인 객체를 그대로 돌려줍니다.
> 하나의 파이프라인에서 여러 번역을 동시에 실행해도 번역 결과는 서로 영향을 주지 않습니다.
> 다만 `translateWithWarnings`의 경고는 동시에 진행 중인 다른 번역의 것이 섞이거나 빠질 수 있으니, 경고를 정확히 받아야 하면 한 번에 하나씩 실행하세요.

**성능 참고치** — Apple M4, Node.js 22, 프로세스 하나(단일 스레드), HaruMT 0.1.0 기준입니다.

| 항목 | 측정값 |
|------|--------|
| 첫 파이프라인 생성 + 첫 문장 | 약 1.1초 |
| 적재 직후 메모리(RSS) | 약 0.5GB |
| 번역 속도 | 초당 약 190문장 (약 5,700자) |
| 연속 번역 중 메모리(RSS) | 1.1GB 안팎까지 증가 |

소설·회의록·자막·위키 문서 등에서 고르게 뽑은 8,090문장(문장당 평균 30자)을 한 문장씩 번역해 잰 값입니다. 문장이 길수록 문장당 시간은 늘어납니다.

### 문체 (`register`)

출력 문체는 `register` 옵션과 **원문의 문체**(정중체/보통체)를 함께 보고 결정됩니다.

| `register` | 원문이 정중체 (ます/です) | 원문이 보통체 (だ/る) | 어울리는 용도 |
|------------|--------------------------|----------------------|---------------|
| `"casual"` (기본값) | 해요체 — 갔어요 | 해체 — 갔어 | 일상 대화, 자막 |
| `"formal"` | 합쇼체 — 갔습니다 | 서술체 — 갔다 | 문어, 뉴스, 보고서 |

### 옵션

`createTranslationPipeline(options)`에 넘길 수 있는 옵션입니다.

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `register` | `"casual"` | 출력 문체. `"casual"` 또는 `"formal"` |
| `dataDir` | 패키지의 `data/` | 번역 데이터 디렉터리. 프로세스에서 처음 지정한 값으로 고정됩니다. |
| `systemDictPath` | 내려받은 사전 | 시스템 사전(`.hrdic`) 경로. 인덱스는 같은 이름의 `.hridx`를 사용합니다. |
| `readingFallbackRule` | `"common"` | 사전에 없는 인명·고유명사·외래어를 독음으로 음역하는 규칙. `"common"`은 관용 표기(타카나시), `"official"`은 외래어 표기법(다카나시)을 따릅니다. |
| `userDictPath` | — | `buildUserDict`로 만든 인명 사용자 사전 파일 경로 (Node 전용. 브라우저 진입점에서는 적용되지 않습니다) |
| `annotateOov`<br>`annotateUserDict` | — | annotation 입력(`AnnotatedText`)을 번역할 때 결과에 미등록어·사용자 사전 표시를 붙입니다. |

### 경고 받기

`translateWithWarnings(text)`는 번역문과 함께 번역 중에 발생한 경고(`Warning[]`)를 돌려줍니다.
품질이 떨어졌을 가능성이 있는 문장을 골라내는 데 활용할 수 있습니다.

```ts
const { text, warnings } = await pipeline.translateWithWarnings("駅まで歩いて行きました。");
```

### 인명 사용자 사전

사전에 없는 인명은 사용자 사전에 등록할 수 있습니다.
등록한 이름은 하나의 단어로 분석되며, `korean`을 생략하면 `reading`을 독음으로 음역합니다.

```ts
import { UserDictionary } from "harumt";

pipeline.replaceUserDictionary(new UserDictionary([
  { japanese: "春沙里", reading: "ハルサリ", category: "person" }
]));
console.log(await pipeline.translate("春沙里さんが来ました。"));
// 하루사리 씨가 왔어요.
```

사용자 사전을 파일로 보관하려면 `buildUserDict(entries, path)`로 만든 뒤, 파이프라인 생성 시 `userDictPath`로 지정합니다. 항목에 지정한 역어(`korean`)도 함께 저장됩니다.

같은 옵션으로 만든 파이프라인은 하나의 객체를 공유하므로, `replaceUserDictionary`로 바꾼 사용자 사전도 그 객체를 쓰는 모든 곳에 함께 적용됩니다.

```ts
import { buildUserDict, createTranslationPipeline } from "harumt";

buildUserDict([{ japanese: "春沙里", reading: "ハルサリ", category: "person" }], "user-dict.json");
const pipeline = await createTranslationPipeline({ userDictPath: "user-dict.json" });
```

---

## 브라우저 · 웹 확장

`harumt/webext`는 Node API 없이 동작하는 진입점으로, 데이터 파일을 `fetch`로 읽습니다.

**준비**

1. 패키지의 `data/`를 확장(또는 웹 앱)의 정적 파일 루트 아래 `data/`로 복사합니다.
2. 시스템 사전을 그 아래에 내려받습니다.
   ```bash
   npx harumt-fetch-dictionary --out <루트>/data/dict
   ```
3. 파일 목록 매니페스트(`<루트>/data/files.json`)를 생성합니다.
   ```bash
   npx harumt-webext-manifest <루트>
   ```
4. 만든 확장이나 웹 앱을 배포할 때는 패키지의 `LICENSE.Apache`, `THIRD_PARTY_NOTICES.md`, `licenses/`를 배포물에 함께 넣습니다. 번들에는 KANJIDIC2·Unihan에서 온 독음 표(`src/third-party/`)도 들어가므로 각 디렉터리의 `LICENSE`도 포함합니다.

**사용**

```ts
import { initializeWebext, createTranslationPipeline } from "harumt/webext";

// 확장에서는 생략할 수 있습니다(runtime.getURL로 위치를 찾습니다).
// 일반 웹 페이지에서는 baseUrl을 지정합니다.
await initializeWebext({ baseUrl: "https://example.com/harumt/" });

const pipeline = await createTranslationPipeline({ register: "casual" });
console.log(await pipeline.translate("本を読んでいる。"));
// 책을 읽고 있어.
```

> **주의**
>
> - `initializeWebext`는 한 번만 호출할 수 있습니다. 호출하지 않으면 첫 파이프라인을 만들 때 확장 런타임 기준으로 초기화됩니다.
> - 사전 전체(약 300MB)를 메모리에 올리므로, 메인 스레드보다 **Worker에서 실행하는 것을 권장**합니다.
> - 브라우저에서는 번역 호출이 내부적으로 한 번에 하나씩 순서대로 처리됩니다.

---

## 진단 CLI

번역 결과가 왜 그렇게 나왔는지 궁금할 때 사용합니다.
형태소 분석, 사전 조회, 패턴 매칭, 번역 결과를 단계별로 출력합니다.

```bash
npx harumt-diagnose "駅まで歩いて行きました。"
```

| 옵션 | 설명 |
|------|------|
| `--data-dir <dir>` | 번역 데이터 디렉터리 지정 |
| `--system-dict <path>` | 시스템 사전 경로 지정 |
| `--no-color` | 색상 출력 끄기 |

---

## 개발 방식과 피드백

HaruMT는 별도의 내부 저장소에서 개발하며, 이 공개 저장소는 릴리즈마다 내부 저장소에서
생성하는 스냅샷입니다. 그래서 커밋 이력이 릴리즈 단위로만 남고, 주석과 테스트는 아직
포함되어 있지 않습니다(정리해서 차례로 공개할 예정입니다).

프로젝트의 설계는 직접 했고, 코드와 사전 역어의 상당 부분은 LLM의 도움을 받아 작성했습니다.
변경할 때마다 내부 전체 코퍼스의 번역 결과를 이전 버전과 비교해 개선과 회귀를 확인합니다.

이런 방식 때문에 아직 외부 코드 기여(Pull Request)는 받지 않습니다.
대신 [GitHub Issues](https://github.com/saturnsky/harumt/issues)로 버그 제보와 제안을 받고 있습니다.
제보 방법과 처리 방식은 [기여 안내](CONTRIBUTING.md)를 참고하세요.

[GitHub Sponsors](https://github.com/sponsors/saturnsky)를 통해서도 개발을 응원하실 수 있습니다.

---

## 감사의 말

데이터 구조, 사전 데이터, annotation 인터페이스 등에 크게 기여해 주신 [lifthrasiir](https://github.com/lifthrasiir)님께 감사드립니다.

HaruMT의 형태소 분석은 Works Applications의 [Sudachi](https://github.com/WorksApplications/Sudachi) 위에 서 있습니다.
분석기는 [sudachi.rs](https://github.com/WorksApplications/sudachi.rs)를 TypeScript로 옮긴 것이고, 시스템 사전은 [SudachiDict](https://github.com/WorksApplications/SudachiDict)를 변환한 것입니다.
한자 독음 처리에는 EDRDG의 [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project)를 사용합니다.

## 라이선스

HaruMT의 코드와 사전 데이터는 [Apache License 2.0](LICENSE.Apache)으로 배포됩니다.
다만 아래 두 부분은 원 저작물의 라이선스를 그대로 따릅니다.

| 부분 | 출처 | 라이선스 |
|------|------|----------|
| `src/third-party/kanjidic2/` (한자 독음 표) | [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) (EDRDG) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `src/third-party/unihan/` (한자 한국어 독음 표) | [Unihan](https://www.unicode.org/charts/unihan.html) (Unicode, Inc.) | [Unicode License v3](https://www.unicode.org/license.txt) |

각 부분의 출처와 라이선스 고지는 `src/third-party/kanjidic2/LICENSE`, `src/third-party/unihan/LICENSE`에 있습니다.
그 밖의 서드파티 데이터와 코드의 고지는 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)와 [`licenses/`](licenses/)를 참고하세요.
