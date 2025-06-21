/**
 * JIRA/Redmine → JSON コンバータ
 * 外部システムのデータを Ultra Minimal Task Manager 形式に変換
 */

class TaskDataConverter {
    /**
     * RedmineのCSV → TasksJSON変換
     */
    static convertFromRedmineCSV(csvData) {
        const tasks = csvData.map((row, index) => ({
            id: parseInt(row['#']) || index + 1,
            title: row['題名'] || 'untitled',
            planned_date: this.parseRedmineDate(row['開始日']),
            planned_hours: parseFloat(row['予定工数']) || 0,
            actual_hours: parseFloat(row['作業時間']) || 0,
            status: this.redmineStatusToMinimal(row['ステータス'])
        })).filter(t => t.planned_date); // 日付があるもののみ
        
        return {
            last_updated: new Date().toISOString(),
            next_id: Math.max(...tasks.map(t => t.id)) + 1,
            tasks: tasks
        };
    }

    /**
     * JIRA API JSON → TasksJSON変換
     */
    static convertFromJiraJSON(jiraIssues) {
        const tasks = jiraIssues.map((issue, index) => ({
            id: this.extractJiraNumber(issue.key) || index + 1,
            title: issue.fields.summary || 'untitled',
            planned_date: this.parseISODate(issue.fields.duedate || issue.fields.created),
            planned_hours: (issue.fields.timeoriginalestimate || 0) / 3600,
            actual_hours: (issue.fields.timespent || 0) / 3600,
            status: this.jiraStatusToMinimal(issue.fields.status.name)
        })).filter(t => t.planned_date);
        
        return {
            last_updated: new Date().toISOString(),
            next_id: Math.max(...tasks.map(t => t.id)) + 1,
            tasks: tasks
        };
    }

    /**
     * TasksJSON → RedmineCSV変換
     */
    static convertToRedmineCSV(tasksData) {
        return tasksData.tasks.map(task => ({
            '#': task.id,
            '題名': task.title,
            '開始日': task.planned_date,
            '予定工数': task.planned_hours,
            '作業時間': task.actual_hours,
            'ステータス': this.minimalStatusToRedmine(task.status)
        }));
    }

    // ===== ヘルパー関数 =====

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

    static redmineStatusToMinimal(status) {
        const statusMap = {
            '新規': '予定',
            '進行中': '実行中',
            '作業中': '実行中',
            '完了': '完了',
            '終了': '完了',
            '却下': '完了',
            '解決': '完了'
        };
        return statusMap[status] || '予定';
    }

    static jiraStatusToMinimal(status) {
        const statusMap = {
            'Open': '予定',
            'To Do': '予定',
            'Backlog': '予定',
            'In Progress': '実行中',
            'Doing': '実行中',
            'In Review': '実行中',
            'Done': '完了',
            'Closed': '完了',
            'Resolved': '完了'
        };
        return statusMap[status] || '予定';
    }

    static minimalStatusToRedmine(status) {
        const statusMap = {
            '予定': '新規',
            '実行中': '進行中',
            '完了': '完了'
        };
        return statusMap[status] || '新規';
    }

    // ===== CSV操作ユーティリティ =====

    /**
     * CSV文字列をオブジェクト配列に変換
     */
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

    /**
     * CSV行をパース（カンマとクォートを考慮）
     */
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

    /**
     * オブジェクト配列をCSV文字列に変換
     */
    static arrayToCSV(array) {
        if (array.length === 0) return '';
        
        const headers = Object.keys(array[0]);
        const csvRows = [headers.join(',')];
        
        array.forEach(obj => {
            const values = headers.map(header => {
                const value = obj[header] || '';
                // カンマが含まれる場合はクォートで囲む
                return value.toString().includes(',') ? `"${value}"` : value;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }

    // ===== 使用例とテスト =====

    /**
     * サンプルRedmineデータでテスト
     */
    static testRedmineConversion() {
        const sampleRedmineCSV = [
            {
                '#': '85',
                '題名': 'Microsoft Translator APIキー取得',
                '開始日': '21 6月 2025',
                '予定工数': '2',
                '作業時間': '2.5',
                'ステータス': '完了'
            },
            {
                '#': '86',
                '題名': 'タスク管理システム開発',
                '開始日': '22 6月 2025',
                '予定工数': '4',
                '作業時間': '0',
                'ステータス': '新規'
            }
        ];

        const converted = this.convertFromRedmineCSV(sampleRedmineCSV);
        console.log('Redmine → JSON変換結果:');
        console.log(JSON.stringify(converted, null, 2));
        
        return converted;
    }

    /**
     * サンプルJIRAデータでテスト
     */
    static testJiraConversion() {
        const sampleJiraData = [
            {
                key: "PROJ-123",
                fields: {
                    summary: "API Integration Task",
                    status: { name: "In Progress" },
                    created: "2025-06-21T09:00:00.000Z",
                    duedate: "2025-06-22",
                    timeoriginalestimate: 7200, // 2 hours in seconds
                    timespent: 3600 // 1 hour in seconds
                }
            },
            {
                key: "PROJ-124", 
                fields: {
                    summary: "Database Setup",
                    status: { name: "Done" },
                    created: "2025-06-20T10:00:00.000Z",
                    duedate: "2025-06-21",
                    timeoriginalestimate: 10800, // 3 hours
                    timespent: 10800 // 3 hours
                }
            }
        ];

        const converted = this.convertFromJiraJSON(sampleJiraData);
        console.log('JIRA → JSON変換結果:');
        console.log(JSON.stringify(converted, null, 2));
        
        return converted;
    }

    /**
     * 変換精度テスト
     */
    static runConversionTests() {
        console.log('=== タスクデータコンバータ テスト ===\n');
        
        // Redmineテスト
        console.log('1. Redmine変換テスト:');
        const redmineResult = this.testRedmineConversion();
        
        console.log('\n2. JIRA変換テスト:');
        const jiraResult = this.testJiraConversion();
        
        // 逆変換テスト
        console.log('\n3. 逆変換テスト (JSON → Redmine CSV):');
        const backToRedmine = this.convertToRedmineCSV(redmineResult);
        console.log(backToRedmine);
        
        console.log('\n✅ 全てのテストが完了しました！');
        
        return {
            redmine: redmineResult,
            jira: jiraResult,
            csvOutput: backToRedmine
        };
    }
}

// Node.js環境での使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskDataConverter;
}

// ブラウザ環境での使用
if (typeof window !== 'undefined') {
    window.TaskDataConverter = TaskDataConverter;
}

// 使用例コメント
/*
// === 使用方法 ===

// 1. RedmineのCSVデータを変換
const redmineCSV = [
    { '#': '1', '題名': 'タスク1', '開始日': '21 6月 2025', ... }
];
const tasksData = TaskDataConverter.convertFromRedmineCSV(redmineCSV);

// 2. JIRA APIデータを変換  
const jiraIssues = [
    { key: "PROJ-1", fields: { summary: "Task 1", ... } }
];
const tasksData = TaskDataConverter.convertFromJiraJSON(jiraIssues);

// 3. 結果のJSONを保存
localStorage.setItem('tasks', JSON.stringify(tasksData));

// 4. Ultra Minimal Task Managerで読み込み
const taskManager = new FileBasedTaskManager();
taskManager.data = tasksData;
taskManager.updateDisplay();
*/
