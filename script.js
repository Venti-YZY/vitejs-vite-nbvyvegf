/* ================================
   星·秘社 - 神秘学社区脚本
   对接 Supabase 实现数据存储
============================== */

// ═══════════════════════════════════════════════════════════════
// ⚙️ Supabase 配置
// ═══════════════════════════════════════════════════════════════
// 请在此处填写你的 Supabase 配置信息
const SUPABASE_URL = 'YOUR_SUPABASE_URL';      // 例如: 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // 例如: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// 初始化 Supabase 客户端
let supabase;
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ═══════════════════════════════════════════════════════════════
// 📌 状态管理
// ═══════════════════════════════════════════════════════════════
let currentTab = 'share';
let pageSize = 10;
let offsets = {
    share: 0,
    qa: 0,
    knowledge: 0
};

// ═══════════════════════════════════════════════════════════════
// 🚀 初始化
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadContent();
});

// 标签切换
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName).classList.add('active');
            
            currentTab = tabName;
            loadContent();
        });
    });
}

// 加载内容
async function loadContent() {
    switch(currentTab) {
        case 'share':
            await loadShares();
            break;
        case 'qa':
            await loadQuestions();
            break;
        case 'knowledge':
            await loadArticles();
            break;
    }
}

// ═══════════════════════════════════════════════════════════════
// 📝 日常分享功能
// ═══════════════════════════════════════════════════════════════

// 发布分享
async function publishShare() {
    const nickname = document.getElementById('share-nickname').value.trim();
    const content = document.getElementById('share-content').value.trim();
    
    if (!nickname) return alert('请输入昵称');
    if (!content) return alert('请输入内容');
    
    if (!supabase) return alert('请先配置 Supabase');
    
    try {
        const { error } = await supabase
            .from('shares')
            .insert([{ nickname, content }]);
        
        if (error) throw error;
        
        document.getElementById('share-nickname').value = '';
        document.getElementById('share-content').value = '';
        
        offsets.share = 0;
        await loadShares();
    } catch (err) {
        console.error('发布失败:', err);
        alert('发布失败: ' + err.message);
    }
}

// 加载分享列表
async function loadShares() {
    const container = document.getElementById('share-list');
    container.innerHTML = '<div class="loading">加载中</div>';
    
    try {
        const { data, error } = await supabase
            .from('shares')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offsets.share, offsets.share + pageSize - 1);
        
        if (error) throw error;
        
        offsets.share += pageSize;
        
        if (data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✧</div>
                    <div class="empty-state-text">暂无分享，成为第一个分享者吧</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.map((item, index) => `
            <div class="card" style="animation-delay: ${index * 0.05}s">
                <div class="card-header">
                    <span class="card-nickname">${escapeHtml(item.nickname)}</span>
                    <span class="card-time">${formatTime(item.created_at)}</span>
                </div>
                <div class="card-content">${escapeHtml(item.content)}</div>
                <div class="card-footer">
                    <span></span>
                    <div class="card-actions">
                        <button class="action-btn ${item.liked ? 'liked' : ''}" onclick="likeShare('${item.id}')">
                            ♥ ${item.likes || 0}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (err) {
        console.error('加载失败:', err);
        container.innerHTML = '<div class="empty-state">加载失败</div>';
    }
}

// 点赞分享
async function likeShare(id) {
    if (!supabase) return alert('请先配置 Supabase');
    
    try {
        const { data } = await supabase
            .from('shares')
            .select('likes')
            .eq('id', id)
            .single();
        
        await supabase
            .from('shares')
            .update({ likes: (data?.likes || 0) + 1 })
            .eq('id', id);
        
        await loadShares();
    } catch (err) {
        console.error('点赞失败:', err);
    }
}

// ═══════════════════════════════════════════════════════════════
// ❓ 互助问答功能
// ═══════════════════════════════════════════════════════════════

// 发布问题
async function publishQuestion() {
    const nickname = document.getElementById('qa-nickname').value.trim();
    const title = document.getElementById('qa-title').value.trim();
    const content = document.getElementById('qa-content').value.trim();
    
    if (!nickname) return alert('请输入昵称');
    if (!title) return alert('请输入问题标题');
    if (!content) return alert('请输入问题内容');
    
    if (!supabase) return alert('请先配置 Supabase');
    
    try {
        const { error } = await supabase
            .from('questions')
            .insert([{ nickname, title, content, answers: [] }]);
        
        if (error) throw error;
        
        document.getElementById('qa-nickname').value = '';
        document.getElementById('qa-title').value = '';
        document.getElementById('qa-content').value = '';
        
        offsets.qa = 0;
        await loadQuestions();
    } catch (err) {
        console.error('发布失败:', err);
        alert('发布失败: ' + err.message);
    }
}

// 加载问题列表
async function loadQuestions() {
    const container = document.getElementById('qa-list');
    container.innerHTML = '<div class="loading">加载中</div>';
    
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offsets.qa, offsets.qa + pageSize - 1);
        
        if (error) throw error;
        
        offsets.qa += pageSize;
        
        if (data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⟡</div>
                    <div class="empty-state-text">暂无问题，抛出你的疑惑吧</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.map((item, index) => {
            const answers = item.answers || [];
            const answersHtml = answers.map(a => `
                <div class="answer-item">
                    <div class="answer-header">
                        <span class="answer-nickname">${escapeHtml(a.nickname)}</span>
                        <span class="answer-time">${formatTime(a.created_at)}</span>
                    </div>
                    <div class="answer-content">${escapeHtml(a.content)}</div>
                </div>
            `).join('');
            
            return `
                <div class="card" style="animation-delay: ${index * 0.05}s">
                    <div class="card-header">
                        <span class="card-nickname">${escapeHtml(item.nickname)}</span>
                        <span class="card-time">${formatTime(item.created_at)}</span>
                    </div>
                    <div class="card-title">${escapeHtml(item.title)}</div>
                    <div class="card-content">${escapeHtml(item.content)}</div>
                    <div class="answers-section">
                        ${answersHtml}
                        <div class="reply-input-wrap">
                            <input type="text" class="reply-input" id="reply-${item.id}" placeholder="写下你的回答...">
                            <button class="reply-btn" onclick="replyQuestion('${item.id}')">回复</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('加载失败:', err);
        container.innerHTML = '<div class="empty-state">加载失败</div>';
    }
}

// 回复问题
async function replyQuestion(id) {
    const input = document.getElementById(`reply-${id}`);
    const content = input.value.trim();
    const nickname = prompt('请输入你的昵称:');
    
    if (!nickname) return;
    if (!content) return alert('请输入回复内容');
    if (!supabase) return alert('请先配置 Supabase');
    
    try {
        const { data } = await supabase
            .from('questions')
            .select('answers')
            .eq('id', id)
            .single();
        
        const answers = data?.answers || [];
        answers.push({
            nickname,
            content,
            created_at: new Date().toISOString()
        });
        
        await supabase
            .from('questions')
            .update({ answers })
            .eq('id', id);
        
        await loadQuestions();
    } catch (err) {
        console.error('回复失败:', err);
        alert('回复失败: ' + err.message);
    }
}

// ═══════════════════════════════════════════════════════════════
// 📚 知识传授功能
// ═══════════════════════════════════════════════════════════════

// 发布文章
async function publishArticle() {
    const nickname = document.getElementById('knowledge-nickname').value.trim();
    const title = document.getElementById('knowledge-title').value.trim();
    const category = document.getElementById('knowledge-category').value;
    const content = document.getElementById('knowledge-content').value.trim();
    
    if (!nickname) return alert('请输入作者昵称');
    if (!title) return alert('请输入文章标题');
    if (!category) return alert('请选择分类');
    if (!content) return alert('请输入文章内容');
    
    if (!supabase) return alert('请先配置 Supabase');
    
    try {
        const { error } = await supabase
            .from('articles')
            .insert([{ nickname, title, category, content }]);
        
        if (error) throw error;
        
        document.getElementById('knowledge-nickname').value = '';
        document.getElementById('knowledge-title').value = '';
        document.getElementById('knowledge-category').value = '';
        document.getElementById('knowledge-content').value = '';
        
        offsets.knowledge = 0;
        await loadArticles();
    } catch (err) {
        console.error('发布失败:', err);
        alert('发布失败: ' + err.message);
    }
}

// 加载文章列表
async function loadArticles() {
    const container = document.getElementById('knowledge-list');
    container.innerHTML = '<div class="loading">加载中</div>';
    
    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offsets.knowledge, offsets.knowledge + pageSize - 1);
        
        if (error) throw error;
        
        offsets.knowledge += pageSize;
        
        if (data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⦿</div>
                    <div class="empty-state-text">暂无知识，快来分享吧</div>
                </div>
            `;
            return;
        }
        
        const categoryMap = {
            tarot: '塔罗牌',
            astrology: '占星术',
            runes: '卢恩符文',
            divination: '占卜',
            ritual: '仪式',
            other: '其他'
        };
        
        container.innerHTML = data.map((item, index) => `
            <div class="card" style="animation-delay: ${index * 0.05}s">
                <div class="card-header">
                    <span class="card-nickname">${escapeHtml(item.nickname)}</span>
                    <span class="card-time">${formatTime(item.created_at)}</span>
                </div>
                <div class="card-title">${escapeHtml(item.title)}</div>
                <div class="card-content">${escapeHtml(item.content.substring(0, 200))}${item.content.length > 200 ? '...' : ''}</div>
                <div class="card-footer">
                    <span class="card-category">${categoryMap[item.category] || item.category}</span>
                    <div class="card-actions">
                        <button class="action-btn" onclick="viewArticle('${item.id}')">阅读全文 →</button>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (err) {
        console.error('加载失败:', err);
        container.innerHTML = '<div class="empty-state">加载失败</div>';
    }
}

// 阅读全文
async function viewArticle(id) {
    try {
        const { data } = await supabase
            .from('articles')
            .select('*')
            .eq('id', id)
            .single();
        
        if (!data) return;
        
        const categoryMap = {
            tarot: '塔罗牌',
            astrology: '占星术',
            runes: '卢恩符文',
            divination: '占卜',
            ritual: '仪式',
            other: '其他'
        };
        
        alert(`${data.title}\n\n作者: ${data.nickname}\n分类: ${categoryMap[data.category] || data.category}\n\n${data.content}`);
    } catch (err) {
        console.error('加载失败:', err);
    }
}

// ═════════════════════════════════════════════════════════════──
// 🔄 加载更多
// ═══════════════════════════════════════════════════════════════
async function loadMore() {
    await loadContent();
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ 工具函数
// ═══════════════════════════════════════════════════════════════

// 格式化时间
function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return `${date.getMonth() + 1}-${date.getDate()}`;
}

// HTML转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
