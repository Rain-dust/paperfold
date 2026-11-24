# 圆形纸雕模板与导出

## 改造模板

需要复用引擎时，将 [turning-garden](../assets/turning-garden/index.html) 所在目录整体复制到作品目录，再打开副本的 `index.html`。相对路径引用同目录的脚本、样式和音效，浏览器支持 WebGL 即可本地预览。用 [设计与审片](direction.md) 选定拍点，按新题材更换页图、地表、构件、场景活动和照明声效，按新模型的占地和画幅重算构图。示例的折叠与导出入口可以复用。

| 修改目标 | 模板入口 |
| --- | --- |
| 扇形折纸网格、立页、构图和着色 | `fold.js` 的 `paperGeometry`、纸面着色器、`framing`、`packingAt` |
| 建筑和庭院的模型、平面图及地表色 | `garden.js` 的 `build`、`groundArt` |
| 书的封面和展页插画 | `pages.js` 的 `GardenPages.produce` |
| 开合节奏、风、飞行动线与布料等 | `life.js` 的 `beats`、`angleAt`、`birdPose`，以及 `fold.js` 的模型动画 |
| 角色的路线和步态 | `cat.js` 的 `GardenCat.build`、`pose` 和对应着色器 |
| 晨昏、互动选中区域、按钮和音效 | `lanterns.js`、`fold.js` 的 `hit`、`renderAt`、`tick`，以及 `index.html` |

模型组的铰点、动作模式和开始角度由 `g(pivot, at, duration, mode, hinge, flutter)` 声明。其中 `at` 与 `duration` 是角度，`after(progress, ...supports)` 指定支承构件的动作进度。默认出场角由组内占据的最远方位和支承限制共同推迟。新造型收在本组铰点，表面动作保持同一变换，纹理跟着构件走。角色用本地坐标建模，路线在世界坐标里另外计算。

用 `window.circularFold.setAngle(degrees)` 跳到指定展开状态。用 `window.renderAt(seconds)` 检查成片叙事与同步，时间参数相同应得到相同画面。手动模式的角色、风和光可以在折纸停住时继续运行。保持这些状态入口分开，避免滑进度条时重复触发动作与音效。

模板的互动声音来源记录在 [AUDIO.md](../assets/turning-garden/AUDIO.md)。新作品若更换题材或时间线，按纸边经过、木构件接触、脚落地等可见动作重新对音。

## 检查主角净空与材质

- 在折边最薄的角度、模型立起中、主角接触表面前后，用成片帧率逐帧看实际机位。再换侧视或查看已变换的网格，用叶尖、翅梢等外轮廓核对净空。需要一眼跟住主角时，可把正常遮挡下的轮廓和临时忽略场景深度的同色轮廓比对，定位哪一帧被哪一层挡住。对有意遮挡的镜头，核对前后深度与再出现的位置。
- 漂浮或落地时，用整个姿态的最低点检查接触面，高度随转动更新。同时沿路径检查岸线、石块和枝叶等有厚度的近邻。让水纹在铺稳的纸地上随流向推进，用少量速度不同的纹理与反光表现主流和近岸。涟漪由接触点发起，尾波留在漂浮物身后。
- 对承担体积的云团或树冠，用同一机位运动看厚度、重叠和明暗两面。前后体块、侧面和支承关系要能读出。平面插画可用来预告稍后立起的实体。

## 渲染静帧和视频

[render.cjs](../scripts/render.cjs) 用 Playwright 打开本地 HTML 并在 `?export=1` 下调用 `window.renderAt(t)`。输出 MP4 还需要 FFmpeg（PATH 中的 `ffmpeg`，支持 libx264）。下列命令从技能目录运行。

```sh
node scripts/render.cjs assets/turning-garden/index.html cover.png --at 0 --width 1280 --height 1024
node scripts/render.cjs assets/turning-garden/index.html fold.mp4 --fps 60 --width 1920 --height 1536
node scripts/render.cjs project/index.html scene.mp4 --duration 12 --fps 60 --width 1920 --height 1080 --audio project/foley.wav
```

模板默认取页面提供的时长。指定 `--audio` 时从零秒混入准备好的音轨，以画面时长截断或补静音。可用 `--playwright <模块路径>` 指向宿主已安装的包，或用 `--browser <可执行文件>` 使用已有 Chromium。无 GPU 的环境若无法创建 WebGL，可加 `--software-gl`。试画尺寸和角度后再渲染成片，确保机位适合目标画幅。
