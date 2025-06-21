/**
 * JIRA/Redmine → JSON コンバータ v2
 * 外部システムのデータを Ultra Minimal Task Manager v2 形式に変換
 */

class TaskDataConverterV2 {
    /**
     * RedmineのAPI → TasksJSON変換 (v2対応)
     */
    static convertFromRedmineAPI(redmineResponse) {
        const issues = redmineResponse.issues || [];
        
        const tasks = issues.map((issue, index) => ({
            id: issue.id,
            title: issue.subject,
            planned_date: issue.start_date || new Date().toISOString().split('T')[0],
            planned_hours: issue.estimated_hours || (index < 3 ? 2 : 3), // デフォルト見積もり
            actual_hours: issue.spent_hours || 0,
            status: this.convertRedmineStatus(issue.status.name),
            done_ratio: issue.done_ratio || 0,
            priority: issue.priority ? issue.priority.name : '通常'
        }));
        
        return {
            last_updated: new Date().toISOString(),
            next_id: Math.max(...tasks.map(t => t.id)) + 1,
            tasks: tasks
        };
    }

    /**
     * RedmineのCSV → TasksJSON変換 (v1互換)
     */
    static convertFromRedmineCSV(csvData) {
        const tasks = csvData.map((row, index) => ({
            id: parseInt(row['#']) || index + 1,
            title: row['題名'] || 'untitled',
            planned_date: this.parseRedmineDate(row['開始日']),
            planned_hours: parseFloat(row['予定工数']) || 0,
            actual_hours: parseFloat(row['作業時間']) || 0,
            status: this.redmineStatusToMinimal(row['ステータス'])
        })).filter(t => t.planned_date);
        
        return {
            last_updated: new Date().toISOString(),
            next_id: Math.max(...tasks.map(t => t.id)) + 1,
            tasks: tasks
        };
    }

    /**
     * JIRA API JSON → TasksJSON変換 (v2対応)
     */
    static convertFromJiraJSON(jiraIssues) {
        const tasks = jiraIssues.map((issue, index) => ({
            id: this.extractJiraNumber(issue.key) || index + 1,
            title: issue.fields.summary || 'untitled',
            planned_date: this.parseISODate(issue.fields.duedate || issue.fields.created),
            planned_hours: (issue.fields.timeoriginalestimate || 0) / 3600,
            actual_hours: (issue.fields.timespent || 0) / 3600,
            status: this.jiraStatusToMinimal(issue.fields.status.name),
            priority: issue.fields.priority ? issue.fields.priority.name : 'Medium'
        })).filter(t => t.planned_date);
        
        return {
            last_updated: new Date().toISOString(),
            next_id: Math.max(...tasks.map(t => t.id)) + 1,
            tasks: tasks
        };
    }

    // ===== ステータス変換 =====

    static convertRedmineStatus(status) {
        const statusMap = {
            '新規': 'scheduled',
            '進行中': 'in-progress',
            '作業中': 'in-progress',
            '完了': 'completed',
            '終了': 'completed',
            '却下': 'completed',
            '解決': 'completed'
        };
        return statusMap[status] || 'scheduled';
    }

    static redmineStatusToMinimal(status) {
        return this.convertRedmineStatus(status);
    }

    static jiraStatusToMinimal(status) {
        const statusMap = {
            'Open': 'scheduled',
            'To Do': 'scheduled',
            'Backlog': 'scheduled',
            'In Progress': 'in-progress',
            'Doing': 'in-progress',
            'In Review': 'in-progress',
            'Done': 'completed',
            'Closed': 'completed',
            'Resolved': 'completed'
        };
        return statusMap[status] || 'scheduled';
    }

    static minimalStatusToRedmine(status) {
        const statusMap = {
            'scheduled': '新規',
            'in-progress': '進行中',
            'completed': '完了'
        };
        return statusMap[status] || '新規';
    }

    // ===== 日付パース =====

    static parseRedmineDate(dateStr) {
        if (!dateStr || dateStr === "") return null;
        
        // "21 6月 2025" 形式をパース
        const match = dateStr.match(/(\d+)\s+(\d+)月\s+(\d+)/);
        if (match) {
            const [, day, month, year] = match;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // ISO形式の場合
        if (dateStr.includes('-')) {
            return dateStr.split('T')[0];
        }
        
        return null;
    }

    static parseISODate(dateStr) {
        return dateStr ? dateStr.split('T')[0] : null;
    }

    static extractJiraNumber(key) {
        if (!key) return null;
        const match = key.match(/-(\d+)$/);
        return match ? parseInt(match[1]) : null;
    }

    // ===== v2専用関数 =====

    /**
     * v2タスクマネージャーにRedmineデータをロード
     */
    static loadRedmineDataToV2(redmineResponse, taskManagerInstance) {
        const convertedData = this.convertFromRedmineAPI(redmineResponse);
        taskManagerInstance.data = convertedData;
        taskManagerInstance.render();
        return convertedData;
    }

    /**
     * v2用のリアルタイムRedmine同期
     */
    static generateRedmineIntegrationScript(redmineResponse) {
        const convertedData = this.convertFromRedmineAPI(redmineResponse);
        
        return `
// === Ultra Minimal Task Manager v2 Redmine Integration ===
function loadRealRedmineDataV2() {
    const realTasksData = ${JSON.stringify(convertedData, null, 2)};
    
    // v2のtaskManagerインスタンスに実際のデータを設定
    if (typeof taskManager !== 'undefined' && taskManager.data) {
        taskManager.data = realTasksData;
        taskManager.render();
        taskManager.showNotification('実際のRedmineデータを読み込みました！タスク数: ' + realTasksData.tasks.length + '個');
        console.log('Redmine → v2変換完了:', realTasksData);
    } else {
        alert('v2のTaskManagerが見つかりません。ページをリロードしてください。');
    }
}

// 自動実行
loadRealRedmineDataV2();
`;
    }

    // ===== CSV操作ユーティリティ (v1互換) =====

    static parseCSV(csvString) {
        const lines = csvString.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        return lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || '';
            });
            return obj;
        });
    }

    static parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    static arrayToCSV(array) {
        if (array.length === 0) return '';
        
        const headers = Object.keys(array[0]);
        const csvRows = [headers.join(',')];
        
        array.forEach(obj => {
            const values = headers.map(header => {
                const value = obj[header] || '';
                return value.toString().includes(',') ? `"${value}"` : value;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }

    // ===== テスト関数 =====

    static testV2Conversion() {
        console.log('=== v2コンバータ テスト開始 ===\n');
        
        // サンプルRedmine APIレスポンス
        const sampleRedmineAPI = {
            "issues": [
                {
                    "id": 85,
                    "subject": "Microsoft Translator APIキー取得・翻訳機能統合",
                    "status": {"name": "新規"},
                    "start_date": "2025-06-21",
                    "estimated_hours": null,
                    "spent_hours": 0.0,
                    "done_ratio": 30,
                    "priority": {"name": "急いで"}
                },
                {
                    "id": 84,
                    "subject": "NASブログホスト移行プロジェクト", 
                    "status": {"name": "進行中"},
                    "start_date": "2025-06-21",
                    "estimated_hours": 4,
                    "spent_hours": 1.5,
                    "done_ratio": 25,
                    "priority": {"name": "今すぐ"}
                }
            ]
        };

        const converted = this.convertFromRedmineAPI(sampleRedmineAPI);
        console.log('変換結果:');
        console.log(JSON.stringify(converted, null, 2));

        console.log('\n=== v2統合スクリプト生成 ===');
        const script = this.generateRedmineIntegrationScript(sampleRedmineAPI);
        console.log(script);

        console.log('\n✅ v2テスト完了！');
        return { converted, script };
    }
}

// Node.js環境での使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskDataConverterV2;
}

// ブラウザ環境での使用
if (typeof window !== 'undefined') {
    window.TaskDataConverterV2 = TaskDataConverterV2;
}

// 使用例コメント
/*
// === v2での使用方法 ===

// 1. Redmine APIデータをv2に直接ロード
const taskManagerV2 = new TaskManagerV2();
const redmineData = await fetch('/api/redmine/issues').then(r => r.json());
TaskDataConverterV2.loadRedmineDataToV2(redmineData, taskManagerV2);

// 2. コンソール実行用スクリプト生成
const script = TaskDataConverterV2.generateRedmineIntegrationScript(redmineData);
console.log(script); // ブラウザコンソールで実行

// 3. v1互換CSV変換も利用可能
const csvData = TaskDataConverterV2.parseCSV(csvString);
const tasksData = TaskDataConverterV2.convertFromRedmineCSV(csvData);
*/