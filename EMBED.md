# Timbre Ornament の組み込み方

普通のサイトに飾りとして入れるなら、`ornament.js` を読み込んで、背景にしたい要素へ mount します。

```html
<section class="hero" id="ornamentHost">
  <div class="content">
    <h1>Page Title</h1>
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

`#ornamentHost` には `position: relative` と `overflow: hidden` を付けると扱いやすいです。
中の本文やボタンは `position: relative; z-index: 1;` にすると、装飾が背面に回ります。

## MIDIで反応させる

Web MIDI はブラウザの決まりで、ボタンなどのクリック後に接続する必要があります。

```js
document.querySelector("#midiButton").addEventListener("click", async () => {
  await ornament.enableMidi();
});
```

MIDIがないページでも、サイト側のイベントから反応を出せます。

```js
ornament.hit(0.9);
ornament.setTone(2);
ornament.noteOn(64, 110);
ornament.noteOff(64);
```

## 使い分け

- `index.html`: MIDIビジュアライザーの実験ページ
- `embed-demo.html`: 実際のサイト背景に入れたサンプル
- `ornament.js`: 他のサイトへ持っていく本体
