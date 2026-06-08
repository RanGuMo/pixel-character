```bash
pixel-character/
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.js                       # 入口，注册 Vue/Pinia/ElementPlus
    ├── App.vue                       # 主壳：顶栏 + 画布 + 面板 + 预设栏
    ├── styles/main.css               # 全局样式 + 动画 keyframes
    ├── stores/app.js                 # Pinia store（所有状态 + 持久化）
    └── components/
        ├── CropView.vue              # 裁切画布（上传区 + SpriteEditor）
        ├── SpriteEditor.vue          # 精灵图 + 拖拽裁切框（pointer events）
        ├── CropPanel.vue             # 右侧面板：行列网格 + 区域滑块
        ├── LibraryView.vue           # 部件库：分类展示 + HTML5拖拽
        ├── CategoryPanel.vue         # 分类管理：增删改颜色/名称
        ├── AssemblyView.vue          # 角色渲染：动态计算包围盒 + 动画
        ├── AssemblyPanel.vue         # 混搭面板：选部件 + 偏移±800 + 层级
        ├── PartPickerModal.vue       # ElementPlus Dialog 部件选择器
        └── PresetBar.vue             # 底部预设栏：切换/新建/右键管理
```