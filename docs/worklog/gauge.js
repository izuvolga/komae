
// GaugeFormat.js
class GaugeFormat {
  constructor(
    loc_y,
    loc_x,
    w,
    h,
    side,
    frame_horizontal_width = 7,
    frame_vertical_width = 6,
    frame_width = 1
  ) {
    this.loc_y = loc_y;
    this.loc_x = loc_x;
    this.w = w;
    this.h = h;
    this.side = side; // 'left' | 'right'
    this.lastHp = 100;
    this.frame_horizontal_width = frame_horizontal_width;
    this.frame_vertical_width = frame_vertical_width;
    this.frame_width = frame_width;
  }

  /**
   * @param {number} hp 0..100（負値の場合は lastHp/diff の処理に入る）
   * @param {Object} [opts]
   * @param {number|null} [opts.loc_y=null]
   * @param {number|null} [opts.loc_x=null]
   * @param {number|null} [opts.w=null]
   * @param {number|null} [opts.h=null]
   * @param {boolean} [opts.visible=true]
   * @param {number|null} [opts.gap=null]  // truthy なら赤い減少分バーを描画
   * @param {number|null} [opts.diff=null] // hp<0 のとき lastHp + diff を採用
   * @returns {string} SVG markup
   */
  genSvg(hp, opts = {}) {
    const {
      loc_y = null,
      loc_x = null,
      w = null,
      h = null,
      visible = true,
      gap = null,
      diff = null,
    } = opts;

    // Python の int() 相当（正負とも 0 方向へ丸め）
    const toInt = (v) => (v == null ? v : (v < 0 ? Math.ceil(v) : Math.floor(v)));

    hp = toInt(hp);
    const diffInt = toInt(diff);

    // hp が負なら、Python 実装と同様の分岐
    if (hp < 0) {
      if (diffInt != null) {
        hp = Math.max(0, Math.min(100, toInt(this.lastHp + diffInt)));
      } else {
        // 再帰的に lastHp で生成（JS ではオブジェクト引数で呼び直す）
        return this.genSvg(this.lastHp, { loc_y, loc_x, w, h, visible, gap, diff });
      }
    }

    const msgs = [];
    if (!visible) {
      this.lastHp = hp;
      return msgs.join('');
    }

    const bar_frame_width = w != null ? w : this.w;
    const bar_frame_height = h != null ? h : this.h;

    let y = loc_y == null ? this.loc_y : loc_y;
    let x = loc_x == null ? this.loc_x : loc_x;

    const bar_width = bar_frame_width - this.frame_horizontal_width;
    const bar_height = bar_frame_height - this.frame_vertical_width;

    let frame = '';
    let gauge = '';
    let red_gauge = '';

    const reduce = toInt(bar_width * ((100 - hp) / 100));
    const last_reduce = toInt(bar_width * ((100 - this.lastHp) / 100));

    if (this.side === 'left') {
      // 枠
      frame = `
        <rect x="${x - this.frame_width}" y="${y - this.frame_width}" rx="2" ry="2" width="${bar_frame_width + this.frame_width}" height="${bar_frame_height + this.frame_width}" fill="none" stroke-opacity="100%" stroke-width="${this.frame_width}" stroke="#333" />
        <rect x="${x + (this.frame_vertical_width >> 1)}" y="${y + (this.frame_vertical_width >> 1)}" rx="2" ry="2" width="${bar_frame_width - this.frame_vertical_width}" height="${bar_frame_height - this.frame_vertical_width}" fill="url(#whiteBlur)" stroke-opacity="50%" stroke-width="${this.frame_width}" stroke="#AAA" />
        <rect x="${x}" y="${y}" rx="2" ry="2" width="${bar_frame_width}" height="${bar_frame_height}" fill="#000" fill-opacity="50%" />
      `;

      // 減少分（赤）
      red_gauge = `
        <rect x="${x + (this.frame_vertical_width >> 1) + last_reduce}" y="${y + (this.frame_vertical_width >> 1)}" width="${Math.max(0, reduce - last_reduce)}" height="${bar_height}" fill="red" />
        <rect x="${x + (this.frame_vertical_width >> 1) + last_reduce}" y="${y + (this.frame_vertical_width >> 1)}" width="${Math.max(0, reduce - last_reduce)}" height="${bar_height}" fill="url(#whiteBlur)" />
      `;

      // ゲージ本体（左→右、viewBox でスライド）
      gauge = `
        <svg x="${x + (this.frame_vertical_width >> 1) + reduce}" y="${y + (this.frame_vertical_width >> 1)}" width="${bar_width}" height="${bar_height}" viewBox="${reduce} 0 ${bar_width} ${bar_height}" preserveAspectRatio="none">
          <rect x="0" y="0" rx="2" ry="2" width="${bar_width}" height="${bar_height}" fill="url(#gauge)"/>
          <rect x="0" y="0" rx="2" ry="2" width="${bar_width}" height="${bar_height}" fill="url(#whiteBlur)"/>
        </svg>
      `;
    } else if (this.side === 'right') {
      // Python 実装の「手計算」ロジックに合わせて right_bar_x は loc_x をそのまま使用
      const right_bar_x = x;

      frame = `
        <rect x="${right_bar_x - this.frame_width}" y="${y - this.frame_width}" rx="2" ry="2" width="${bar_frame_width + this.frame_width}" height="${bar_frame_height + this.frame_width}" fill="none" stroke-opacity="100%" stroke-width="${this.frame_width}" stroke="#333" />
        <rect x="${right_bar_x + (this.frame_vertical_width >> 1)}" y="${y + (this.frame_vertical_width >> 1)}" rx="2" ry="2" width="${bar_frame_width - this.frame_vertical_width}" height="${bar_frame_height - this.frame_vertical_width}" fill="url(#whiteBlur)" stroke-opacity="50%" stroke-width="${this.frame_width}" stroke="#AAA" />
        <rect x="${right_bar_x}" y="${y}" rx="2" ry="2" width="${bar_frame_width}" height="${bar_frame_height}" fill="#000" fill-opacity="50%" />
      `;

      // 右詰めゲージ（scale(-1,1) を使用）
      gauge = `
        <svg x="${right_bar_x + 3}" y="${y + 3}" width="${bar_width - reduce}" height="${bar_height}" preserveAspectRatio="none">
          <rect x="${-bar_width}" y="0" rx="2" ry="2" width="${bar_width}" height="${bar_height}" fill="url(#gauge)" transform="scale(-1,1)" />
          <rect x="${-bar_width}" y="0" rx="2" ry="2" width="${bar_width}" height="${bar_height}" fill="url(#whiteBlur)" transform="scale(-1,1)" />
        </svg>
      `;

      red_gauge = `
        <rect x="${right_bar_x + 3 + (bar_width - reduce)}" y="${y + 3}" width="${Math.max(0, reduce - last_reduce)}" height="${bar_height}" fill="red" />
        <rect x="${right_bar_x + 3 + (bar_width - reduce)}" y="${y + 3}" width="${Math.max(0, reduce - last_reduce)}" height="${bar_height}" fill="url(#whiteBlur)" />
      `;
    }

    this.lastHp = hp;

    msgs.push('<g class="hidable">');
    msgs.push(frame);
    msgs.push(gauge);
    if (gap) msgs.push(red_gauge);
    msgs.push('</g>');

    return msgs.join('');
  }
}

function run () {
  const g = new GaugeFormat(0, 0, 300, 24, 'left');
  const svg = g.genSvg(80, {
    loc_y: 0,
    loc_x: 0,
    w: 300,
    h: 24,
    visible: true,
    gap: 10,
  });
  return `<svg
  width="500px"
  height="500px"
  viewBox="0 0 500 500"
  xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gauge">
      <stop offset="0%" stop-color="#339933"/>
      <stop offset="40%" stop-color="#ffcc00"/>
      <stop offset="60%" stop-color="#ffcc00"/>
      <stop offset="100%" stop-color="#ff9900"/>
    </linearGradient>
    <linearGradient id="whiteBlur" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#FFF" stop-opacity="80%"/>
      <stop offset="50%" stop-color="#FFF" stop-opacity="0%" />
    </linearGradient>
    <filter id="f1" x="0" y="0">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
    </filter>
  </defs>
  ${svg}
</svg>`;
}

console.log(run());
