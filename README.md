# 🎯 Ultra Minimal Task Manager

**「明日やること」「計画vs実績」に特化した超最小タスク管理システム**

## ✨ 特徴

### 🎯 本質のみに集中
- **明日やること** - シンプルなタスクリスト
- **今日の振り返り** - 予定vs実績の比較
- **AI分析連携** - JSONデータをコピペでAI分析

### 📁 ファイル1つで完結
- `index.html` - これだけで完全動作
- `tasks.json` - データファイル（自動生成）

### 🔄 システム間連携
- Redmine CSV → JSON変換
- JIRA API → JSON変換  
- JSON → Redmine CSV逆変換

## 🚀 使い方

### 1. 基本操作
1. `index.html` をブラウザで開く
2. 「サンプルデータ読み込み」でデモ開始
3. 明日のタスクを追加
4. 実績時間を記録
5. 今日の振り返りを確認

### 2. AI分析
1. 「AI分析用データ」をコピー
2. ChatGPT等に貼り付け
3. 計画最適化・改善提案を取得

### 3. データ管理
- 「データ保存」で`tasks.json`をダウンロード
- ローカルファイルとして保存・管理

## 📊 データ構造

### tasks.json
```json
{
  "last_updated": "2025-06-21T10:30:00Z",
  "next_id": 4,
  "tasks": [
    {
      "id": 1,
      "title": "Azure Translator設定",
      "planned_date": "2025-06-22",
      "planned_hours": 2,
      "actual_hours": 0,
      "status": "予定"
    }
  ]
}
```

### AI分析用データ
```json
{
  "type": "daily_review_and_planning",
  "today_performance": {
    "tasks": [...],
    "summary": {
      "planned_total": 5,
      "actual_total": 5.3,
      "accuracy_percentage": "106.0"
    }
  },
  "tomorrow_current_plan": [...],
  "ai_request": "今日の実績を分析し、明日の計画を最適化してください"
}
```

## 🔄 外部システム連携

### Redmine連携
```javascript
// RedmineのCSV → tasks.json変換
const converter = new TaskDataConverter();
const tasksData = converter.convertFromRedmineCSV(csvData);
```

### JIRA連携
```javascript
// JIRA API → tasks.json変換
const tasksData = converter.convertFromJiraJSON(jiraIssues);
```

## 🎨 カスタマイズ

### スタイル変更
`index.html`内のCSSを編集して外観をカスタマイズ可能

### 機能拡張
- 親子タスク関係
- カテゴリ分類
- 時間トラッキング
- チーム機能

## 🌟 設計思想

> **「入力 → 実行 → 報告」のシンプルな流れに特化**

- **開始前**: タスクの定義と計画
- **開始後**: 実行状況と完了報告
- **余計な機能は一切排除**

複雑なプロジェクト管理システムも、結局は「明日何をやるか」「計画通りできたか」が本質。

## 📝 ライセンス

MIT License

## 🤝 コントリビュート

Issues、Pull Requestsは大歓迎です！

## 🔗 リンク

- [デモページ](https://chnmototmz.github.io/ultra-minimal-task-manager/)
- [Issues](https://github.com/chnmotoTmz/ultra-minimal-task-manager/issues)
- [Releases](https://github.com/chnmotoTmz/ultra-minimal-task-manager/releases)

---

**シンプルであることは究極の洗練である** - レオナルド・ダ・ヴィンチ
