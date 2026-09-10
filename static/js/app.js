// DOM Elements
const chat = document.getElementById('chat');
const form = document.getElementById('chatForm');
const questionInput = document.getElementById('question');
const sendBtn = document.getElementById('sendBtn');
const trace = document.getElementById('trace');
const sourceUsed = document.getElementById('sourceUsed');
const sourceUsedBadge = document.getElementById('sourceUsedBadge');
const flowSteps = document.querySelectorAll('.flow-step');

// Toast Notification
function showToast(message, duration = 2500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Markdown Parser Helper
function renderMarkdown(text) {
    if (typeof marked !== 'undefined' && marked.parse) {
        try {
            return marked.parse(text);
        } catch (e) {
            console.error('Markdown parse error:', e);
        }
    }
    // Fallback if marked fails
    return text.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])).replace(/\n/g, '<br>');
}

// Format Source Type
function getSourceConfig(source = '') {
    const s = (source || '').toLowerCase();
    if (s.includes('kb') || s.includes('private')) {
        return { label: 'Private KB', class: 'private_kb', icon: '🔒' };
    }
    if (s.includes('web') || s.includes('tavily')) {
        return { label: 'Tavily Web Search', class: 'web', icon: '🌐' };
    }
    if (s.includes('direct')) {
        return { label: 'Direct Response', class: 'direct', icon: '⚡' };
    }
    return { label: source || 'Completed', class: 'neutral', icon: '✓' };
}

// Add Message to Chat
function addMessage(role, text, source = '', citations = []) {
    const wrap = document.createElement('div');
    wrap.className = `message ${role}`;

    let avatarSvg = '';
    if (role === 'assistant') {
        avatarSvg = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                <circle cx="12" cy="5" r="2"></circle>
                <path d="M12 7v4"></path>
                <line x1="8" y1="16" x2="8" y2="16"></line>
                <line x1="16" y1="16" x2="16" y2="16"></line>
            </svg>`;
    } else {
        avatarSvg = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>`;
    }

    let metaHtml = '';
    if (role === 'assistant' && source) {
        const conf = getSourceConfig(source);
        let citeHtml = '';
        if (citations && citations.length) {
            citeHtml = `
                <div class="citations-box">
                    <div class="citations-title">Verified Sources & Citations</div>
                    <div>${citations.map(c => c.url ? `<a class="citation-link" href="${c.url}" target="_blank" rel="noopener noreferrer">↗ ${c.title || c.url}</a>` : `<span class="citation-link">📄 ${c.title}</span>`).join('')}</div>
                </div>`;
        }
        metaHtml = `
            <div class="answer-meta">
                <div class="source-badge-row">
                    <span>Evidence Source:</span>
                    <span class="source-badge ${conf.class}">${conf.icon} ${conf.label}</span>
                </div>
                ${citeHtml}
            </div>`;
    }

    const renderedContent = role === 'assistant' ? renderMarkdown(text) : renderMarkdown(text);

    wrap.innerHTML = `
        <div class="avatar-wrap">
            <div class="avatar">${avatarSvg}</div>
        </div>
        <div class="bubble">
            <div class="bubble-actions">
                <button class="copy-btn" type="button" title="Copy to clipboard">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                </button>
            </div>
            <div class="bubble-content">${renderedContent}</div>
            ${metaHtml}
        </div>
    `;

    // Copy event listener
    const copyBtn = wrap.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(text).then(() => {
                copyBtn.querySelector('span').textContent = 'Copied!';
                showToast('Answer copied to clipboard');
                setTimeout(() => {
                    copyBtn.querySelector('span').textContent = 'Copy';
                }, 2000);
            });
        });
    }

    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;
    return wrap;
}

// Temporary Loading Indicator
function showThinkingIndicator() {
    const wrap = document.createElement('div');
    wrap.className = 'message assistant thinking-message';
    wrap.id = 'thinkingIndicator';
    wrap.innerHTML = `
        <div class="avatar-wrap">
            <div class="avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                    <circle cx="12" cy="5" r="2"></circle>
                    <path d="M12 7v4"></path>
                </svg>
            </div>
        </div>
        <div class="bubble thinking-bubble">
            <div class="dots"><span></span><span></span><span></span></div>
            <span class="thinking-text" id="thinkingStepText">Evaluating LangGraph workflow...</span>
        </div>
    `;
    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;
    return wrap;
}

function removeThinkingIndicator() {
    const el = document.getElementById('thinkingIndicator');
    if (el) el.remove();
}

// Classify Trace Items for Visual Styling
function getTraceClass(text = '') {
    const lower = text.toLowerCase();
    if (lower.includes('router')) return 'router';
    if (lower.includes('retrieval') || lower.includes('chunks')) return 'retrieval';
    if (lower.includes('grade → good')) return 'grade-good';
    if (lower.includes('grade → weak')) return 'grade-weak';
    if (lower.includes('web') || lower.includes('tavily')) return 'web';
    if (lower.includes('rewrite')) return 'rewrite';
    return '';
}

// Render Trace Feed
function renderTrace(items = []) {
    if (!items || !items.length) {
        trace.innerHTML = `
            <div class="empty-state">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 14 14"></polyline>
                </svg>
                <p>No execution trace recorded.</p>
            </div>`;
        return;
    }

    trace.innerHTML = items.map((x, idx) => {
        const cls = getTraceClass(x);
        return `
            <div class="trace-item ${cls}">
                <div style="font-size: 10px; color: #64748b; margin-bottom: 2px;">Step ${idx + 1}</div>
                <div>${x}</div>
            </div>`;
    }).join('');

    trace.scrollTop = trace.scrollHeight;

    // Highlight Workflow Sidebar Step
    highlightWorkflowSteps(items);
}

// Highlight Active Step in Sidebar
function highlightWorkflowSteps(items = []) {
    flowSteps.forEach(s => s.classList.remove('active'));
    const fullText = items.join(' ').toLowerCase();

    if (fullText.includes('router')) {
        document.querySelector('.flow-step[data-step="route"]')?.classList.add('active');
    }
    if (fullText.includes('retrieval') || fullText.includes('chunks')) {
        document.querySelector('.flow-step[data-step="retrieve"]')?.classList.add('active');
    }
    if (fullText.includes('grade')) {
        document.querySelector('.flow-step[data-step="grade"]')?.classList.add('active');
    }
    if (fullText.includes('web')) {
        document.querySelector('.flow-step[data-step="web"]')?.classList.add('active');
    }
    if (fullText.includes('rewrite')) {
        document.querySelector('.flow-step[data-step="rewrite"]')?.classList.add('active');
    }
    if (fullText.includes('generation') || fullText.includes('direct response')) {
        document.querySelector('.flow-step[data-step="generate"]')?.classList.add('active');
    }
}

// Execute Agentic RAG Question
async function askAgent(q) {
    if (!q || !q.trim()) return;
    const cleanQ = q.trim();

    addMessage('user', cleanQ);
    questionInput.value = '';
    questionInput.style.height = 'auto';

    sendBtn.disabled = true;
    showThinkingIndicator();

    if (sourceUsedBadge) {
        sourceUsedBadge.textContent = 'Processing...';
        sourceUsedBadge.className = 'source-tag neutral';
    }
    sourceUsed.textContent = 'LangGraph Active';

    renderTrace(['Workflow started: Evaluating question intent...']);

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: cleanQ }),
        });

        let data = null;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            data = await res.json();
        } else {
            const rawHtml = await res.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawHtml;
            const titleOrHeading = tempDiv.querySelector('h1, h2, title, p')?.textContent?.trim() || '';
            const cleanSnippet = titleOrHeading || rawHtml.replace(/<[^>]*>/g, ' ').slice(0, 160).trim();
            throw new Error(`Server returned HTTP ${res.status}: ${cleanSnippet || res.statusText}`);
        }

        removeThinkingIndicator();

        if (!res.ok) {
            throw new Error(data.detail || `Server returned error ${res.status}`);
        }

        const sourceConf = getSourceConfig(data.source_used);

        if (sourceUsedBadge) {
            sourceUsedBadge.textContent = sourceConf.label;
            sourceUsedBadge.className = `source-tag ${sourceConf.class}`;
        }
        sourceUsed.textContent = data.source_used || 'Completed';

        addMessage('assistant', data.answer, data.source_used, data.citations || []);
        renderTrace(data.trace || []);

    } catch (e) {
        removeThinkingIndicator();
        addMessage('assistant', `⚠️ **Error Processing Request**\n\n${e.message}\n\nPlease check server connection or contact system administrator.`);
        renderTrace(['Request execution failed with exception.']);
        if (sourceUsedBadge) {
            sourceUsedBadge.textContent = 'Error';
            sourceUsedBadge.className = 'source-tag neutral';
        }
        sourceUsed.textContent = 'Failed';
        showToast('Request failed: ' + e.message, 4000);
    } finally {
        sendBtn.disabled = false;
        questionInput.focus();
    }
}

// Form Submission
form.addEventListener('submit', e => {
    e.preventDefault();
    const q = questionInput.value.trim();
    if (q) askAgent(q);
});

// Auto-expand textarea & Keyboard shortcut (Enter to submit, Shift+Enter for newline)
questionInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const q = questionInput.value.trim();
        if (q) askAgent(q);
    }
});

questionInput.addEventListener('input', () => {
    questionInput.style.height = 'auto';
    questionInput.style.height = Math.min(questionInput.scrollHeight, 140) + 'px';
});

// Example Prompts Click Handler
document.querySelectorAll('.example').forEach(b => {
    b.addEventListener('click', () => {
        const text = b.textContent.trim();
        askAgent(text);
    });
});

// ==================== DOCUMENT INGESTION MODAL ====================
const modal = document.getElementById('uploadModal');
const openUpload = document.getElementById('openUpload');
const closeUpload = document.getElementById('closeUpload');
const modalBackdrop = document.getElementById('modalBackdrop');
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const dropzoneText = document.getElementById('dropzoneText');
const uploadBtn = document.getElementById('uploadBtn');
const uploadBtnText = document.getElementById('uploadBtnText');
const uploadSpinner = document.getElementById('uploadSpinner');
const uploadStatus = document.getElementById('uploadStatus');
const adminKeyInput = document.getElementById('adminKey');

function openModal() {
    modal.classList.remove('hidden');
    uploadStatus.classList.add('hidden');
    uploadStatus.textContent = '';
    adminKeyInput.focus();
}

function closeModal() {
    modal.classList.add('hidden');
}

openUpload.addEventListener('click', openModal);
closeUpload.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);

// Drag and drop feedback
['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, e => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, e => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
    });
});

dropzone.addEventListener('drop', e => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelected(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
        handleFileSelected(fileInput.files[0]);
    }
});

function handleFileSelected(file) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    dropzoneText.innerHTML = `Selected: <strong>${file.name}</strong> (${sizeMb} MB)`;
}

// Upload Action
uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    const key = adminKeyInput.value.trim();

    if (!file) {
        uploadStatus.className = 'upload-status-box error';
        uploadStatus.textContent = 'Please choose a document file first.';
        uploadStatus.classList.remove('hidden');
        return;
    }

    uploadStatus.className = 'upload-status-box';
    uploadStatus.textContent = `Processing and chunking ${file.name}... Embedding into Pinecone.`;
    uploadStatus.classList.remove('hidden');

    uploadBtn.disabled = true;
    uploadBtnText.textContent = 'Indexing into Pinecone...';
    uploadSpinner.classList.remove('hidden');

    const fd = new FormData();
    fd.append('file', file);

    try {
        const res = await fetch('/api/ingest', {
            method: 'POST',
            headers: { 'X-Admin-Key': key },
            body: fd,
        });

        const d = await res.json();
        if (!res.ok) throw new Error(d.detail || 'Ingestion failed');

        uploadStatus.className = 'upload-status-box success';
        uploadStatus.innerHTML = `✓ <strong>Document Indexed Successfully!</strong><br>File: ${d.file}<br>Created: ${d.chunks} chunks (${d.ids_created || d.chunks} vectors in Pinecone).`;
        showToast('Document indexed into Pinecone!');

        // Reset file input after successful upload
        fileInput.value = '';
        dropzoneText.innerHTML = 'Drag & drop policy file here, or <strong>browse</strong>';
    } catch (e) {
        uploadStatus.className = 'upload-status-box error';
        uploadStatus.innerHTML = `✕ <strong>Upload Failed:</strong> ${e.message}`;
    } finally {
        uploadBtn.disabled = false;
        uploadBtnText.textContent = 'Start Embed & Ingest';
        uploadSpinner.classList.add('hidden');
    }
});

// ==================== MOBILE RESPONSIVE DRAWER TOGGLES ====================
const toggleSidebar = document.getElementById('toggleSidebar');
const toggleTrace = document.getElementById('toggleTrace');
const sidebar = document.getElementById('sidebar');
const tracePanel = document.getElementById('tracePanel');

if (toggleSidebar && sidebar) {
    toggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        tracePanel?.classList.remove('open');
    });
}

if (toggleTrace && tracePanel) {
    toggleTrace.addEventListener('click', () => {
        tracePanel.classList.toggle('open');
        sidebar?.classList.remove('open');
    });
}

// Close mobile drawers on click outside
document.addEventListener('click', e => {
    if (window.innerWidth <= 1180) {
        if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggleSidebar.contains(e.target)) {
            sidebar.classList.remove('open');
        }
        if (tracePanel && tracePanel.classList.contains('open') && !tracePanel.contains(e.target) && !toggleTrace.contains(e.target)) {
            tracePanel.classList.remove('open');
        }
    }
});