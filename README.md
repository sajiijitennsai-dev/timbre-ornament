# Timbre Ornament

普通のWebサイトに、MIDIで反応する薄いビジュアル装飾を足すための小さなライブラリです。

ヒーロー、ポートフォリオ、イベント告知、音楽アプリの待機画面などに、canvasの背景レイヤーとして入れられます。MIDI入力があれば音に反応し、MIDIがなくてもボタン、スクロール、再生イベントなどから光らせられます。

[デモを開く](http://127.0.0.1:4173/embed-demo.html)

## おすすめの配布方法

最初は **1ファイルで貼れる装飾ライブラリ** として配布するのが一番よさそうです。

1. **GitHubで公開**
   `ornament.js`、`embed-demo.html`、`README.md` を置く。

2. **GitHub Pagesでデモ公開**
   触って見た目を確認できるページを先に見せる。

3. **ZIP配布**
   ノーコード寄りの人や小さなサイト制作者向けに、`ornament.js` だけ持っていけるようにする。

4. **あとからnpm**
   使う人が増えたり、React/Vite向けの需要が出たらnpm化する。

この順番が自然です。効果自体が軽い装飾なので、配布も軽く見えるほうが魅力が伝わります。

## すぐ使う

```html
<section class="hero" id="ornamentHost">
  <div class="content">
    <h1>Your Page Title</h1>
  </div>
</section>

<script src="./ornament.js"></script>
<script>
  const ornament = TimbreOrnament.mount("#ornamentHost", {
    opacity: 0.65,
    intensity: 0.8,
    autoDemo: true,
  });
</script>
```

推奨CSS:

```css
.hero {
  position: relative;
  overflow: hidden;
}

.hero .content {
  position: relative;
  z-index: 1;
}
```

## MIDIで反応させる

Web MIDIはブラウザの仕様上、ボタンなどのユーザー操作後に接続する必要があります。

```html
<button id="midiButton">MIDIを有効にする</button>

<script>
  document.querySelector("#midiButton").addEventListener("click", async () => {
    const result = await ornament.enableMidi();
    console.log(result.ok ? "MIDI connected" : result.reason);
  });
</script>
```

MIDI接続後は、ノート入力で粒子や波が出ます。プログラムチェンジを受けると色味が切り替わります。

## MIDIなしで反応させる

普通のWebサイトのイベントからも使えます。

```js
ornament.hit(0.9);
ornament.setTone(2);
ornament.noteOn(64, 110);
ornament.noteOff(64);
```

例:

- ボタンを押したら `ornament.hit(0.8)`
- 曲の再生が始まったら `ornament.setTone(1)`
- セクションに入ったら `ornament.hit(0.5)`
- アプリ内の成功演出として `ornament.noteOn(72, 100)`

## API

### `TimbreOrnament.mount(target, options)`

指定した要素の背面にcanvas装飾を追加します。

`target` はCSSセレクタ、またはDOM要素を渡せます。

| Option | Default | 説明 |
| --- | --- | --- |
| `opacity` | `0.62` | canvasレイヤーの透明度 |
| `intensity` | `0.78` | 粒子と波の強さ |
| `autoDemo` | `true` | 入力がない時も少しだけ動かす |
| `fixed` | `false` | 画面全体に固定表示する |
| `zIndex` | `0` | canvasのz-index |
| `tones` | built in | 色と反応のプリセット |

戻り値:

| Method | 説明 |
| --- | --- |
| `enableMidi()` | Web MIDI接続を要求します |
| `hit(amount)` | 短い装飾反応を出します |
| `setTone(index)` | 色味と反応タイプを切り替えます |
| `noteOn(note, velocity)` | MIDIノート風の反応を出します |
| `noteOff(note)` | ノートを止めます |
| `destroy()` | canvasとイベントを削除します |

## 色味を変える

```js
const ornament = TimbreOrnament.mount("#ornamentHost", {
  tones: [
    {
      name: "Warm Tape",
      color: "#ffb86b",
      color2: "#7df0a7",
      attack: 0.45,
      body: 0.82,
      air: 0.32,
    },
  ],
});
```

`attack`、`body`、`air` は `0` から `1` の間がおすすめです。

- `attack`: 粒子の鋭さ
- `body`: 波の深さ
- `air`: 浮遊感

## 配布用説明文

短い説明:

> Timbre Ornamentは、普通のWebサイトにMIDIで反応する空気感を足す小さなcanvas装飾ライブラリです。

英語の短い説明:

> Timbre Ornament is a tiny canvas layer that adds MIDI-reactive ambience to ordinary websites.

長い説明:

> Timbre Ornamentは、MIDIノートやページ内イベントをやわらかな波と粒子に変換し、サイトの背面に薄く重ねるためのライブラリです。ランディングページ、アーティストサイト、ライブ告知、ポートフォリオ、音楽ツールなどで、主役のコンテンツを邪魔せずに音楽的な気配を加えられます。

## ファイル

- `ornament.js`: 配布用の本体
- `embed-demo.html`: 実サイトに混ぜたサンプル
- `index.html`, `app.js`, `styles.css`: MIDIビジュアライザー実験版
- `EMBED.md`: 短い組み込みメモ

## ブラウザ対応

Web MIDIはブラウザによって対応状況が違います。Chromium系ブラウザが一番安定しています。MIDIが使えない環境でも、`hit()`、`setTone()`、`noteOn()` で装飾として使えます。

## License

MIT
