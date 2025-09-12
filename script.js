// Global variables - Fixed syntax issues
let cards = [];
let isCodeView = false;
let cardIdCounter = 0;
let currentViewport = 'desktop';

// Initialize app
function init() {
    loadData();
    if (cards.length === 0) {
        // Add a default card if none exist
        addCard();
    }
    renderEditor();
    updatePreview();
}

// Add new card
function addCard() {
    console.log('addCard function called');
    const newCard = {
        id: ++cardIdCounter,
        title: 'New Card Title',
        rows: 'Row 1\nRow 2'
    };
    cards.push(newCard);
    console.log('Cards array:', cards);
    renderEditor();
    updatePreview();
}

// Delete card
function deleteCard(cardId) {
    cards = cards.filter(card => card.id !== cardId);
    renderEditor();
    updatePreview();
}

// Update card title
function updateCardTitle(cardId, newTitle) {
    const card = cards.find(c => c.id === cardId);
    if (card) {
        card.title = newTitle;
        updatePreview();
    }
}

// Update row content
function updateRows(cardId, newContent) {
    const card = cards.find(c => c.id === cardId);
    if (card) {
        card.rows = newContent;
        updatePreview();
    }
}

// Escape HTML function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Render editor panel
function renderEditor() {
    const editorContainer = document.getElementById('cardsEditor');
    editorContainer.innerHTML = '';

    cards.forEach(card => {
        const cardEditor = document.createElement('div');
        cardEditor.className = 'card-editor';
        cardEditor.innerHTML = `
            <div class="card-editor-header">
                <span>Card ${card.id}</span>
                <button class="btn btn-danger btn-sm" onclick="deleteCard(${card.id})">Delete Card</button>
            </div>
            <div class="card-content">
                <div class="form-group">
                    <label>Card Title:</label>
                    <textarea class="form-control" id="title-${card.id}" onchange="updateCardTitle(${card.id}, this.value)"
                              placeholder="Enter title (one line per row)" rows="1">${escapeHtml(typeof card.title === 'string' ? card.title : card.title.join('\n'))}</textarea>
                </div>
                <div class="form-group">
                    <label>Content Rows:</label>
                    <textarea class="form-control" id="rows-${card.id}" onchange="updateRows(${card.id}, this.value)"
                              placeholder="Enter content (one line per row)" rows="2">${escapeHtml(typeof card.rows === 'string' ? card.rows : card.rows.join('\n'))}</textarea>
                </div>
            </div>
        `;
        editorContainer.appendChild(cardEditor);
    });
}

// Generate HTML code
function generateHTML() {
    const cardsHTML = cards.map(card => {
        const titleLines = (typeof card.title === 'string' ? card.title : card.title.join('\n')).split('\n').filter(line => line.trim());
        const contentLines = (typeof card.rows === 'string' ? card.rows : card.rows.join('\n')).split('\n').filter(line => line.trim());
        
        return `
  <div class="spec-card">
    <div class="spec-header">${titleLines.join('<br />\n    ')}</div>
    <div class="spec-content">
      ${contentLines.join('<br />\n      ')}
    </div>
  </div>`;
    }).join('\n  ');

    return `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
    />
    <style>
      body {
        font-family: Arial, sans-serif;
        padding: 0 10px 0 10px;
      }

      .specs-container {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 2px;
        margin-bottom: 50px;
      }

      .spec-card {
        border: 1px solid rgb(145, 145, 145);
        background-color: #ffffff;
        text-align: center;
        font-size: 14px;
      }

      .spec-header {
        background-color: #f9f9f9;
        padding: 15px;
        font-weight: bold;
        border-bottom: 1px solid rgb(145, 145, 145);
        min-height: 28px;
      }

      .spec-content {
        padding: 15px;
        word-break: break-word;
        white-space: normal;
      }


      .mobile-br,
      .mobile-hyphen {
        display: none;
      }

      @media (max-width: 768px) {
        .specs-container {
          grid-template-columns: repeat(2, 1fr);
        }
        .spec-card {
          font-size: 13px;
        }
        .spec-header,
        .spec-content {
          padding: 10px;
        }
        .mobile-br {
          display: inline;
        }
        .mobile-hyphen::after {
          content: "-";
        }
        .mobile-hyphen {
          display: inline;
        }
      }

      @media (max-width: 480px) {
        .specs-container {
          grid-template-columns: 1fr;
        }
        .spec-card {
          font-size: 12px;
        }
        .spec-header,
        .spec-content {
          padding: 8px;
        }
      }
    </style>
  </head>
  <body>
    <div class="specs-container">
      ${cardsHTML}
    </div>
  </body>
</html>`;
}

// Update preview
function updatePreview() {
    const previewArea = document.getElementById('previewArea');
    const codeTextarea = document.getElementById('codeTextarea');
    
    // Generate cards HTML for preview
    const cardsHTML = cards.map(card => {
        const titleLines = (typeof card.title === 'string' ? card.title : card.title.join('\n')).split('\n').filter(line => line.trim());
        const contentLines = (typeof card.rows === 'string' ? card.rows : card.rows.join('\n')).split('\n').filter(line => line.trim());
        
        return `
        <div class="spec-card">
            <div class="spec-header">${titleLines.join('<br />')}</div>
            <div class="spec-content">
                ${contentLines.join('<br />')}
            </div>
        </div>`;
    }).join('');
    
    previewArea.innerHTML = `<div class="specs-container">${cardsHTML}</div>`;
    codeTextarea.value = generateHTML();
}

// Save data to localStorage
function saveData() {
    try {
        localStorage.setItem('specCards', JSON.stringify(cards));
        localStorage.setItem('cardIdCounter', cardIdCounter.toString());
        showToast('Data saved successfully!', 'success');
    } catch (e) {
        showToast('Error saving data: ' + e.message, 'error');
    }
}

// Load data from localStorage
function loadData() {
    try {
        const savedCards = localStorage.getItem('specCards');
        const savedCounter = localStorage.getItem('cardIdCounter');
        
        if (savedCards) {
            cards = JSON.parse(savedCards);
            
            // Convert old array format to new string format
            cards.forEach(card => {
                if (Array.isArray(card.title)) {
                    card.title = card.title.join('\n');
                }
                if (Array.isArray(card.rows)) {
                    card.rows = card.rows.join('\n');
                }
            });
            
            renderEditor();
            updatePreview();
        }
        if (savedCounter) {
            cardIdCounter = parseInt(savedCounter);
        }
    } catch (e) {
        console.error('Error loading data:', e);
        cards = [];
        cardIdCounter = 0;
    }
}

// Clear all data
function clearAll() {
    if (confirm('Are you sure you want to clear all cards?')) {
        cards = [];
        cardIdCounter = 0;
        renderEditor();
        updatePreview();
        localStorage.removeItem('specCards');
        localStorage.removeItem('cardIdCounter');
    }
}

// Toggle between preview and code view
function toggleView(event) {
    isCodeView = !isCodeView;
    const previewArea = document.getElementById('previewArea');
    const codeArea = document.getElementById('codeArea');
    const toggleBtn = event.target;

    if (isCodeView) {
        previewArea.style.display = 'none';
        codeArea.style.display = 'block';
        toggleBtn.textContent = 'Show Preview';
    } else {
        previewArea.style.display = 'block';
        codeArea.style.display = 'none';
        toggleBtn.textContent = 'Toggle Code View';
    }
}

// Copy code from textarea to clipboard
function copyFromTextarea() {
    const codeTextarea = document.getElementById('codeTextarea');
    const copyBtn = document.querySelector('.copy-btn');
    
    if (navigator.clipboard && window.isSecureContext) {
        // Use modern clipboard API
        navigator.clipboard.writeText(codeTextarea.value).then(function() {
            showCopyFeedback(copyBtn);
        }).catch(function(err) {
            console.error('Could not copy text: ', err);
            fallbackCopyText(codeTextarea.value, copyBtn);
        });
    } else {
        // Fallback for older browsers or non-secure contexts
        fallbackCopyText(codeTextarea.value, copyBtn);
    }
}

// Fallback copy method
function fallbackCopyText(text, copyBtn) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopyFeedback(copyBtn);
    } catch (err) {
        console.error('Fallback: Could not copy text: ', err);
    }
    
    document.body.removeChild(textArea);
}

// Show copy feedback
function showCopyFeedback(copyBtn) {
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    
    setTimeout(function() {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('copied');
    }, 2000);
}

// Set viewport for preview
function setViewport(viewport) {
    currentViewport = viewport;
    const previewContainer = document.getElementById('previewContainer');
    const viewportButtons = document.querySelectorAll('.viewport-btn');
    
    // Update container class
    previewContainer.className = 'preview-container ' + viewport;
    
    // Update active button
    viewportButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase() === viewport) {
            btn.classList.add('active');
        }
    });
}


// Show toast notification
function showToast(message, type = 'success') {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Show toast with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide and remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// Parse HTML and extract card data
function parseHTMLToCards(htmlContent) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const specCards = doc.querySelectorAll('.spec-card');
        
        if (specCards.length === 0) {
            throw new Error('No spec cards found in HTML');
        }
        
        const parsedCards = [];
        let maxId = 0;
        
        specCards.forEach((card, index) => {
            const headerElement = card.querySelector('.spec-header');
            const contentElement = card.querySelector('.spec-content');
            
            if (!headerElement || !contentElement) {
                return; // Skip invalid cards
            }
            
            // Parse title (split by <br> tags)
            const titleHTML = headerElement.innerHTML.trim();
            const titleRows = titleHTML.split(/<br\s*\/?>/i).map(row => row.trim()).filter(row => row);
            
            // Parse content (split by <br> tags)
            const contentHTML = contentElement.innerHTML.trim();
            const contentRows = contentHTML.split(/<br\s*\/?>/i).map(row => row.trim()).filter(row => row);
            
            const cardId = ++maxId;
            parsedCards.push({
                id: cardId,
                title: titleRows.length > 0 ? titleRows.join('\n') : 'Untitled',
                rows: contentRows.length > 0 ? contentRows.join('\n') : ''
            });
        });
        
        return {
            cards: parsedCards,
            maxId: maxId
        };
    } catch (error) {
        console.error('Error parsing HTML:', error);
        throw error;
    }
}

// Parse HTML from textarea and load into editor
function parseFromTextarea() {
    const codeTextarea = document.getElementById('codeTextarea');
    const htmlContent = codeTextarea.value.trim();
    
    try {
        if (!htmlContent) {
            showToast('No HTML content to parse', 'error');
            return;
        }
        
        const result = parseHTMLToCards(htmlContent);
        
        if (result.cards.length === 0) {
            showToast('No valid spec cards found in the HTML', 'error');
            return;
        }
        
        // Replace current cards with parsed cards
        cards = result.cards;
        cardIdCounter = result.maxId;
        
        // Update UI
        renderEditor();
        updatePreview();
        
        showToast(`Successfully imported ${result.cards.length} card(s)!`, 'success');
        
        // Switch back to preview view
        if (isCodeView) {
            const toggleBtn = document.querySelector('.panel-header button[onclick="toggleView(event)"]');
            toggleView({ target: toggleBtn });
            // Update the main toggle button label
            if (toggleBtn) {
                toggleBtn.textContent = 'Toggle Code View';
            }
        }
        
    } catch (error) {
        showToast('Error parsing HTML: ' + error.message, 'error');
    }
}

// Clear textarea
function clearTextarea() {
    const codeTextarea = document.getElementById('codeTextarea');
    codeTextarea.value = '';
    codeTextarea.focus();
}

// Mobile menu functions
function toggleMobileMenu() {
    const editorPanel = document.querySelector('.editor-panel');
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    editorPanel.classList.toggle('mobile-open');
    mobileOverlay.classList.toggle('show');
}

function closeMobileMenu() {
    const editorPanel = document.querySelector('.editor-panel');
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    editorPanel.classList.remove('mobile-open');
    mobileOverlay.classList.remove('show');
}

// Close mobile menu when clicking on a link inside the editor
document.addEventListener('click', function(event) {
    if (window.innerWidth <= 768 && event.target.closest('.editor-panel') && event.target.tagName === 'BUTTON') {
        // Add a small delay to allow the button action to complete
        setTimeout(closeMobileMenu, 100);
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
});

// Add touch gesture support for mobile menu
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', function(event) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
});

document.addEventListener('touchmove', function(event) {
    if (window.innerWidth <= 768) {
        const touchX = event.touches[0].clientX;
        const touchY = event.touches[0].clientY;
        const diffX = touchX - touchStartX;
        const diffY = touchY - touchStartY;

        // Detect horizontal swipe (more horizontal than vertical movement)
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            const editorPanel = document.querySelector('.editor-panel');
            const isMenuOpen = editorPanel.classList.contains('mobile-open');

            // Swipe right to open menu (from left edge)
            if (diffX > 0 && touchStartX < 50 && !isMenuOpen) {
                toggleMobileMenu();
            }
            // Swipe left to close menu
            else if (diffX < 0 && isMenuOpen) {
                closeMobileMenu();
            }
        }
    }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);