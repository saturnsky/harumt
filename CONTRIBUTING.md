# 기여 안내

HaruMT에 관심을 가져 주셔서 감사합니다.
이 문서는 **무엇을 어떻게 제보하면 되는지**, 그리고 **왜 Pull Request를 받지 않는지**를 설명합니다.

## 요약

- 코드 기여(Pull Request)는 **받지 않습니다**.
- 버그, 번역 오류, 제안은 [GitHub Issues](https://github.com/saturnsky/harumt/issues)로 받습니다.
- 번역 오류 제보는 고쳐질 때까지 열어 둡니다. 다만 수정 일정을 약속드리지는 못합니다.

## Pull Request를 받지 않는 이유

이 저장소는 별도의 내부 저장소에서 릴리즈마다 생성하는 **스냅샷**입니다.
여기에 올라온 변경을 병합할 수 있는 개발 브랜치가 이 저장소에는 없습니다.

또한 번역기는 한 곳을 고치면 전혀 다른 문장의 번역이 바뀌는 일이 흔합니다.
그래서 모든 변경은 내부 전체 코퍼스의 번역 결과를 이전 버전과 비교하는 절차를 거치는데,
이 코퍼스와 절차는 공개 저장소에 포함되어 있지 않습니다.

Pull Request를 열어 주시면 병합하지 못하고 닫게 됩니다.
고치고 싶은 것이 있다면 **무엇이 어떻게 잘못되는지를 이슈로** 알려 주세요. 그것이 가장 확실하게 반영되는 길입니다.

## 번역 오류 제보

아래 내용을 적어 주세요. 기대하는 번역은 몰라도 괜찮습니다.

| 항목 | 예 |
|------|----|
| 원문 | `駅まで歩いて行きました。` |
| 실제 번역 결과 | `역까지 걸어서 갔어요.` |
| 기대하는 번역 (선택) | |
| HaruMT 버전 | `0.1.0` |
| 문체(`register`)와 그 밖의 옵션 | `casual` |

- **한 이슈에는 한 가지 현상만** 적어 주세요. 여러 문장이 같은 원인으로 보이면 함께 적어도 됩니다.
- 문장은 **문제가 재현되는 가장 짧은 형태**로 줄여 주시면 좋습니다.
- `npx harumt-diagnose "<원문>"`의 출력을 붙여 주시면 원인을 찾는 데 큰 도움이 됩니다.

### 제보는 이렇게 처리됩니다

1. 최신 버전에서 같은 결과가 나오는지 확인합니다. 이미 고쳐진 경우 그렇게 알려 드리고 닫습니다.
2. 재현되면 내부 회귀 검사 자료에 편입하고, **고쳐질 때까지 이슈를 열어 둡니다.**
3. 수선은 같은 원인의 문장들을 묶어서 진행합니다. 고쳐지면 해당 버전을 알려 드리고 닫으며, 결과는 [CHANGELOG](CHANGELOG.md)에도 적습니다.
4. 고치지 않기로 판단한 경우에는 이유를 적고 닫습니다.

이슈가 닫혔다면 **고쳐졌거나, 고치지 않기로 한 것**입니다.
번역 오류는 끝없이 나올 수 있어서, 제보마다 수정 일정을 약속드리지는 못합니다.
제보가 많은 유형은 우선해서 다룹니다.

### 고치기 어려운 유형

아래는 규칙 기반 방식에서 오는 한계라, 제보해 주셔도 고치지 않기로 하고 닫을 수 있습니다.

- 앞뒤 문장을 봐야 알 수 있는 것 (생략된 주어, 지시어가 가리키는 대상)
- 한 문장 안에서 어느 쪽으로도 읽히는 중의적 표현
- 형태소 분석 단계에서 단어 경계나 품사가 잘못 잡히는 경우 중 일부
- 말투, 농담, 언어유희

### 제보할 때 주의할 점

- **긴 저작물을 그대로 붙이지 마세요.** 소설·기사·가사 등은 문제가 되는 한두 문장만, 가능하면 같은 문형의 다른 문장으로 바꿔서 적어 주세요.
- **개인정보나 사적인 글을 붙이지 마세요.** 이슈에 적은 내용은 누구나 볼 수 있습니다.
- 제보된 문장은 번역 품질 검사 자료로 쓰일 수 있습니다.

## 버그와 사용성 제보

설치 실패, 실행 오류, API 동작 문제는 아래 내용과 함께 알려 주세요.

- 재현할 수 있는 최소한의 코드 또는 명령
- 오류 메시지 전문
- 운영체제, Node.js 버전, HaruMT 버전
- 사전 설치와 관련된 문제라면 `npx harumt-fetch-dictionary`의 출력

API나 사용 편의성에 대한 제안도 이슈로 받습니다.
0.x 버전에서는 API가 바뀔 수 있어서, 지금이 의견을 반영하기 가장 좋은 때입니다.

## 단어·역어 제안

사전에 없는 단어나 더 나은 역어는 번역 오류 제보와 같은 양식으로 알려 주세요.
그 단어가 실제로 쓰인 짧은 예문이 있으면 반영이 훨씬 쉽습니다.
드물게 쓰이는 말은 다른 문장을 오역하게 만들 위험이 있어 등재하지 않을 수 있습니다.

## 그 밖에

- 후원 여부는 제보 처리 순서에 영향을 주지 않습니다.
- 개발 방식에 대한 설명은 [README](README.md#개발-방식과-피드백)에 있습니다.

---

## In English

HaruMT does not accept pull requests: this repository is a snapshot generated from a separate internal
repository on each release, and every change has to pass a full-corpus regression check that is not part of
this repository. Bug reports, mistranslation reports and suggestions are welcome through
[GitHub Issues](https://github.com/saturnsky/harumt/issues). For a mistranslation, please include the source
sentence, the actual output, the package version and the `register` option. Reports are added to the internal
regression data and stay open until fixed; an issue is closed when it is fixed or when we decide not to fix it
(with the reason). No timeline is promised. Fixes are listed in the [CHANGELOG](CHANGELOG.md).
