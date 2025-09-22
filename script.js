// Global variables - Fixed syntax issues
let cards = [];
let isCodeView = false;
let cardIdCounter = 0;
let currentViewport = "desktop";

// Simplified drag state for maximum performance
let dragState = {
  isDragging: false,
  draggedElement: null,
  draggedIndex: -1,
  dropIndicator: null,
  animationFrame: null,
  isTouchDevice: 'ontouchstart' in window
};

// DOM element cache for performance
let domCache = {
  editorContainer: null,
  previewArea: null,
  codeTextarea: null,

  // Cache frequently accessed elements
  getEditorContainer() {
    if (!this.editorContainer) {
      this.editorContainer = document.getElementById("cardsEditor");
    }
    return this.editorContainer;
  },

  getPreviewArea() {
    if (!this.previewArea) {
      this.previewArea = document.getElementById("previewArea");
    }
    return this.previewArea;
  },

  getCodeTextarea() {
    if (!this.codeTextarea) {
      this.codeTextarea = document.getElementById("codeTextarea");
    }
    return this.codeTextarea;
  },

  // Clear cache when DOM structure changes
  clearCache() {
    this.editorContainer = null;
    this.previewArea = null;
    this.codeTextarea = null;
  }
};

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle utility function for high-frequency events
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Update button visibility based on localStorage
function updateButtonVisibility() {
  const loadBtn = document.querySelector('button[onclick="loadData()"]');
  const clearBtn = document.querySelector('button[onclick="clearAll()"]');
  const hasStoredData = localStorage.getItem('specCards') !== null;
  
  if (loadBtn) {
    loadBtn.style.display = hasStoredData ? 'inline-block' : 'none';
  }
  if (clearBtn) {
    clearBtn.style.display = hasStoredData ? 'inline-block' : 'none';
  }
}

// Initialize app
function init() {
  loadData();
  if (cards.length === 0) {
    // Add a default card if none exist
    addCard();
  }
  renderEditor();
  updatePreview();
  updateButtonVisibility();
}

// Add new card
function addCard() {
  console.log("addCard function called");
  const newCard = {
    id: ++cardIdCounter,
    title: "New Card Title",
    rows: "Row 1\nRow 2",
  };
  cards.push(newCard);
  console.log("Cards array:", cards);
  renderEditor();
  updatePreview();
}

// Delete card
function deleteCard(cardId) {
  cards = cards.filter((card) => card.id !== cardId);
  renderEditor();
  updatePreview();
}

// Update card title
function updateCardTitle(cardId, newTitle) {
  const card = cards.find((c) => c.id === cardId);
  if (card) {
    card.title = newTitle;
    updatePreview();
  }
}

// Update row content
function updateRows(cardId, newContent) {
  const card = cards.find((c) => c.id === cardId);
  if (card) {
    card.rows = newContent;
    updatePreview();
  }
}

// Create debounced update functions for better performance
const debouncedRenderEditor = debounce(renderEditor, 16); // ~60fps
const debouncedUpdatePreview = debounce(updatePreview, 16);
const debouncedUpdate = debounce(() => {
  renderEditor();
  updatePreview();
}, 16);

// Optimized reorder function with better performance
function reorderCards(draggedCardId, targetCardId, clientY, targetElement) {
  const draggedIndex = cards.findIndex(card => card.id === draggedCardId);
  const targetIndex = cards.findIndex(card => card.id === targetCardId);

  if (draggedIndex === -1 || targetIndex === -1) return;

  // Determine if we should insert before or after the target
  const rect = targetElement.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  const insertBefore = clientY < midpoint;

  // Remove the dragged card from its current position
  const draggedCard = cards.splice(draggedIndex, 1)[0];

  // Calculate new insertion index
  let newIndex;
  if (insertBefore) {
    newIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
  } else {
    newIndex = targetIndex > draggedIndex ? targetIndex : targetIndex + 1;
  }

  // Insert the card at the new position
  cards.splice(newIndex, 0, draggedCard);

  // Use debounced updates for better performance
  debouncedUpdate();
}

// Ultra-fast drag optimization - minimal DOM manipulation
function initializeDragIndicator() {
  if (!dragState.dropIndicator) {
    dragState.dropIndicator = document.createElement('div');
    dragState.dropIndicator.className = 'drag-drop-indicator';
    dragState.dropIndicator.style.cssText = `
      height: 4px;
      background: linear-gradient(90deg, #007bff, #0056b3);
      border-radius: 2px;
      margin: 8px 0;
      opacity: 0;
      transform: translate3d(0, 0, 0);
      will-change: opacity;
      pointer-events: none;
      position: absolute;
      left: 0;
      right: 0;
    `;
  }
}

function cleanupDragState() {
  // Cancel any pending animation frames
  if (dragState.animationFrame) {
    cancelAnimationFrame(dragState.animationFrame);
    dragState.animationFrame = null;
  }

  // Fast cleanup without querySelectorAll
  if (dragState.draggedElement) {
    dragState.draggedElement.classList.remove('dragging');
    dragState.draggedElement.style.transform = '';
    dragState.draggedElement.style.zIndex = '';
    dragState.draggedElement.style.opacity = '';
  }

  // Hide indicator
  if (dragState.dropIndicator && dragState.dropIndicator.parentNode) {
    dragState.dropIndicator.style.opacity = '0';
    dragState.dropIndicator.parentNode.removeChild(dragState.dropIndicator);
  }

  // Reset state
  dragState.isDragging = false;
  dragState.draggedElement = null;
  dragState.draggedIndex = -1;

  // Re-enable transitions
  const editorContainer = domCache.getEditorContainer();
  if (editorContainer) {
    editorContainer.classList.remove('dragging-active');
  }
}

// Escape HTML function
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Render editor panel with cached DOM access
function renderEditor() {
  const editorContainer = domCache.getEditorContainer();
  if (!editorContainer) return;

  editorContainer.innerHTML = "";

  cards.forEach((card) => {
    const cardEditor = document.createElement("div");
    cardEditor.className = "card-editor";
    cardEditor.dataset.cardId = card.id;
    cardEditor.innerHTML = `
            <div class="card-editor-header">
                <div class="card-editor-header-content">
                    <span class="drag-handle" draggable="true">⋮⋮</span>
                    <span>Card ${card.id}</span>
                </div>
                <button class="btn btn-danger btn-sm" onclick="deleteCard(${
                  card.id
                })">×</button>
            </div>
            <div class="card-content">
                <div class="form-group">
                    <label>Card Title:</label>
                    <textarea class="form-control" id="title-${
                      card.id
                    }" onchange="updateCardTitle(${card.id}, this.value)"
                              placeholder="Enter title (one line per row)" rows="2">${escapeHtml(
                                typeof card.title === "string"
                                  ? card.title
                                  : card.title.join("\n")
                              )}</textarea>
                </div>
                <div class="form-group">
                    <label>Content Rows:</label>
                    <textarea class="form-control" id="rows-${
                      card.id
                    }" onchange="updateRows(${card.id}, this.value)"
                              placeholder="Enter content (one line per row)" rows="4">${escapeHtml(
                                typeof card.rows === "string"
                                  ? card.rows
                                  : card.rows.join("\n")
                              )}</textarea>
                </div>
            </div>
        `;
    
    // Add drag and drop event listeners
    const dragHandle = cardEditor.querySelector('.drag-handle');
    
    dragHandle.addEventListener('dragstart', function(e) {
      // Minimal drag start setup
      dragState.isDragging = true;
      dragState.draggedElement = cardEditor;
      dragState.draggedIndex = cards.findIndex(c => c.id === card.id);

      // Disable transitions for performance
      domCache.getEditorContainer().classList.add('dragging-active');

      cardEditor.classList.add('dragging');
      e.dataTransfer.setData('text/plain', card.id);
      e.dataTransfer.effectAllowed = 'move';

      // Simplified drag image
      e.dataTransfer.setDragImage(cardEditor, cardEditor.offsetWidth / 2, cardEditor.offsetHeight / 2);

      // Initialize indicator
      initializeDragIndicator();
    });
    
    cardEditor.addEventListener('dragend', cleanupDragState);

    cardEditor.addEventListener('dragover', function(e) {
      if (!dragState.isDragging) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    // Ultra-minimal dragenter - no throttling, minimal work
    cardEditor.addEventListener('dragenter', function(e) {
      if (!dragState.isDragging || dragState.draggedElement === cardEditor) return;
      e.preventDefault();

      // Only show indicator, no other visual changes
      const rect = cardEditor.getBoundingClientRect();
      const insertBefore = e.clientY < rect.top + rect.height / 2;

      // Show indicator with minimal DOM work
      if (dragState.dropIndicator) {
        dragState.dropIndicator.style.opacity = '1';
        if (insertBefore) {
          cardEditor.parentNode.insertBefore(dragState.dropIndicator, cardEditor);
        } else {
          cardEditor.parentNode.insertBefore(dragState.dropIndicator, cardEditor.nextSibling);
        }
      }
    });
    
    cardEditor.addEventListener('drop', function(e) {
      if (!dragState.isDragging) return;
      e.preventDefault();

      const draggedCardId = parseInt(e.dataTransfer.getData('text/plain'));
      const targetCardId = parseInt(cardEditor.dataset.cardId);

      if (draggedCardId !== targetCardId) {
        // Ultra-fast reorder without immediate re-render
        const draggedIndex = cards.findIndex(c => c.id === draggedCardId);
        const targetIndex = cards.findIndex(c => c.id === targetCardId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          const rect = cardEditor.getBoundingClientRect();
          const insertBefore = e.clientY < rect.top + rect.height / 2;

          // Remove and insert
          const draggedCard = cards.splice(draggedIndex, 1)[0];
          let newIndex = insertBefore ? targetIndex : targetIndex + 1;
          if (draggedIndex < targetIndex && !insertBefore) newIndex--;
          cards.splice(newIndex, 0, draggedCard);

          // Delayed re-render for smooth drop
          requestAnimationFrame(() => {
            renderEditor();
            updatePreview();
          });
        }
      }

      cleanupDragState();
    });

    // Simplified touch support - just enable draggable on touch devices
    if (dragState.isTouchDevice) {
      // Add haptic feedback
      dragHandle.addEventListener('touchstart', function() {
        if (navigator.vibrate) navigator.vibrate(30);
      }, { passive: true });
    }

    editorContainer.appendChild(cardEditor);
  });
}

// Generate HTML code
function generateHTML() {
  const cardsHTML = cards
    .map((card) => {
      const titleLines = (
        typeof card.title === "string" ? card.title : card.title.join("\n")
      )
        .split("\n")
        .filter((line) => line.trim());
      const contentLines = (
        typeof card.rows === "string" ? card.rows : card.rows.join("\n")
      )
        .split("\n")
        .filter((line) => line.trim());

      return `
  <div class="spec-card">
    <div class="spec-header">${titleLines.join("<br />\n    ")}</div>
    <div class="spec-content">
      ${contentLines.join("<br />\n      ")}
    </div>
  </div>`;
    })
    .join("\n  ");

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

// Update preview with cached DOM access
function updatePreview() {
  const previewArea = domCache.getPreviewArea();
  const codeTextarea = domCache.getCodeTextarea();

  if (!previewArea || !codeTextarea) return;

  // Generate cards HTML for preview
  const cardsHTML = cards
    .map((card) => {
      const titleLines = (
        typeof card.title === "string" ? card.title : card.title.join("\n")
      )
        .split("\n")
        .filter((line) => line.trim());
      const contentLines = (
        typeof card.rows === "string" ? card.rows : card.rows.join("\n")
      )
        .split("\n")
        .filter((line) => line.trim());

      return `
        <div class="spec-card">
            <div class="spec-header">${titleLines.join("<br />")}</div>
            <div class="spec-content">
                ${contentLines.join("<br />")}
            </div>
        </div>`;
    })
    .join("");

  previewArea.innerHTML = `<div class="specs-container">${cardsHTML}</div>`;
  codeTextarea.value = generateHTML();
}

// Save data to localStorage
function saveData() {
  try {
    localStorage.setItem("specCards", JSON.stringify(cards));
    localStorage.setItem("cardIdCounter", cardIdCounter.toString());
    showToast("Data saved successfully!", "success");
    updateButtonVisibility();
  } catch (e) {
    showToast("Error saving data: " + e.message, "error");
  }
}

// Load data from localStorage
function loadData() {
  try {
    const savedCards = localStorage.getItem("specCards");
    const savedCounter = localStorage.getItem("cardIdCounter");

    if (savedCards) {
      cards = JSON.parse(savedCards);

      // Convert old array format to new string format
      cards.forEach((card) => {
        if (Array.isArray(card.title)) {
          card.title = card.title.join("\n");
        }
        if (Array.isArray(card.rows)) {
          card.rows = card.rows.join("\n");
        }
      });

      renderEditor();
      updatePreview();
    }
    if (savedCounter) {
      cardIdCounter = parseInt(savedCounter);
    }
  } catch (e) {
    console.error("Error loading data:", e);
    cards = [];
    cardIdCounter = 0;
  }
}

// Clear all data
function clearAll() {
  if (confirm("Are you sure you want to clear all cards?")) {
    cards = [];
    cardIdCounter = 0;
    renderEditor();
    updatePreview();
    localStorage.removeItem("specCards");
    localStorage.removeItem("cardIdCounter");
    updateButtonVisibility();
  }
}

// Toggle between preview and code view
function toggleView(event) {
  isCodeView = !isCodeView;
  const previewArea = document.getElementById("previewArea");
  const codeArea = document.getElementById("codeArea");
  const toggleBtn = event.target;

  if (isCodeView) {
    previewArea.style.display = "none";
    codeArea.style.display = "block";
    toggleBtn.textContent = "Show Preview";
  } else {
    previewArea.style.display = "block";
    codeArea.style.display = "none";
    toggleBtn.textContent = "Toggle Code View";
  }
}

// Copy code from textarea to clipboard
function copyFromTextarea() {
  const codeTextarea = document.getElementById("codeTextarea");
  const copyBtn = document.querySelector(".copy-btn");

  if (navigator.clipboard && window.isSecureContext) {
    // Use modern clipboard API
    navigator.clipboard
      .writeText(codeTextarea.value)
      .then(function () {
        showCopyFeedback(copyBtn);
      })
      .catch(function (err) {
        console.error("Could not copy text: ", err);
        fallbackCopyText(codeTextarea.value, copyBtn);
      });
  } else {
    // Fallback for older browsers or non-secure contexts
    fallbackCopyText(codeTextarea.value, copyBtn);
  }
}

// Fallback copy method
function fallbackCopyText(text, copyBtn) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand("copy");
    showCopyFeedback(copyBtn);
  } catch (err) {
    console.error("Fallback: Could not copy text: ", err);
  }

  document.body.removeChild(textArea);
}

// Show copy feedback
function showCopyFeedback(copyBtn) {
  const originalText = copyBtn.textContent;
  copyBtn.textContent = "Copied!";
  copyBtn.classList.add("copied");

  setTimeout(function () {
    copyBtn.textContent = originalText;
    copyBtn.classList.remove("copied");
  }, 2000);
}

// Set viewport for preview
function setViewport(viewport) {
  currentViewport = viewport;
  const previewContainer = document.getElementById("previewContainer");
  const viewportButtons = document.querySelectorAll(".viewport-btn");

  // Update container class
  previewContainer.className = "preview-container " + viewport;

  // Update active button
  viewportButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.textContent.trim().toLowerCase() === viewport) {
      btn.classList.add("active");
    }
  });
}

// Show toast notification
function showToast(message, type = "success") {
  // Remove any existing toast
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  // Add to page
  document.body.appendChild(toast);

  // Show toast with animation
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Hide and remove toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
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
    const doc = parser.parseFromString(htmlContent, "text/html");
    let specCards = doc.querySelectorAll(".spec-card");

    // If no cards found in full document, try parsing as fragment
    if (specCards.length === 0) {
      // Try parsing as HTML fragment
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      specCards = tempDiv.querySelectorAll(".spec-card");
    }

    // If still no spec-cards found, try to find common card structures
    if (specCards.length === 0) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;

      // Try common card selectors
      const cardSelectors = [
        '.card',
        '.content-card',
        '.item',
        '.box',
        'div[class*="card"]',
        'article',
        'section'
      ];

      for (const selector of cardSelectors) {
        const potentialCards = tempDiv.querySelectorAll(selector);
        if (potentialCards.length > 0) {
          specCards = potentialCards;
          break;
        }
      }
    }

    if (specCards.length === 0) {
      // Debug: log what was actually parsed
      console.log("Parsed HTML content:", htmlContent.substring(0, 500) + "...");
      console.log("Available elements:", doc.body ? doc.body.innerHTML : "No body found");

      throw new Error(`No cards found in HTML. Please ensure your HTML contains card-like elements.

Preferred structure:
<div class="spec-card">
  <div class="spec-header">Card Title</div>
  <div class="spec-content">Card content here</div>
</div>

Or use common card classes like: .card, .content-card, .item, .box, article, or section`);
    }

    const parsedCards = [];
    let maxId = 0;

    specCards.forEach((card, index) => {
      let headerElement = card.querySelector(".spec-header");
      let contentElement = card.querySelector(".spec-content");

      // If exact spec-header/spec-content not found, try common header/content patterns
      if (!headerElement || !contentElement) {
        // Try various header selectors
        const headerSelectors = [
          '.header', '.title', '.card-header', '.card-title',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          '.name', '.label'
        ];

        // Try various content selectors
        const contentSelectors = [
          '.content', '.body', '.card-body', '.card-content',
          '.description', '.text', '.details', 'p'
        ];

        // Find header
        if (!headerElement) {
          for (const selector of headerSelectors) {
            headerElement = card.querySelector(selector);
            if (headerElement) break;
          }
        }

        // Find content
        if (!contentElement) {
          for (const selector of contentSelectors) {
            contentElement = card.querySelector(selector);
            if (contentElement) break;
          }
        }

        // If still no specific header/content found, try to extract from card directly
        if (!headerElement && !contentElement) {
          // Use first child as header and remaining as content
          const children = Array.from(card.children);
          if (children.length >= 2) {
            headerElement = children[0];
            contentElement = children[1];
          } else if (children.length === 1) {
            // Use card text content as both header and content
            headerElement = children[0];
            contentElement = children[0];
          } else {
            // Use card's direct text content
            const textContent = card.textContent.trim();
            if (textContent) {
              // Create temporary elements
              const tempHeader = document.createElement('div');
              const tempContent = document.createElement('div');

              // Split by lines if possible, otherwise use whole text as header
              const lines = textContent.split('\n').map(line => line.trim()).filter(line => line);
              if (lines.length > 1) {
                tempHeader.textContent = lines[0];
                tempContent.innerHTML = lines.slice(1).join('<br>');
              } else {
                tempHeader.textContent = textContent;
                tempContent.textContent = textContent;
              }

              headerElement = tempHeader;
              contentElement = tempContent;
            }
          }
        }
      }

      if (!headerElement || !contentElement) {
        return; // Skip invalid cards
      }

      // Parse title (split by <br> tags)
      const titleHTML = headerElement.innerHTML.trim();
      const titleRows = titleHTML
        .split(/<br\s*\/?>/i)
        .map((row) => row.trim())
        .filter((row) => row);

      // Parse content (split by <br> tags)
      const contentHTML = contentElement.innerHTML.trim();
      const contentRows = contentHTML
        .split(/<br\s*\/?>/i)
        .map((row) => row.trim())
        .filter((row) => row);

      const cardId = ++maxId;
      parsedCards.push({
        id: cardId,
        title: titleRows.length > 0 ? titleRows.join("\n") : "Untitled",
        rows: contentRows.length > 0 ? contentRows.join("\n") : "",
      });
    });

    return {
      cards: parsedCards,
      maxId: maxId,
    };
  } catch (error) {
    console.error("Error parsing HTML:", error);
    throw error;
  }
}

// Parse HTML from textarea and load into editor
function parseFromTextarea() {
  const codeTextarea = document.getElementById("codeTextarea");
  const htmlContent = codeTextarea.value.trim();

  try {
    if (!htmlContent) {
      showToast("No HTML content to parse", "error");
      return;
    }

    const result = parseHTMLToCards(htmlContent);

    if (result.cards.length === 0) {
      showToast("No valid spec cards found in the HTML", "error");
      return;
    }

    // Replace current cards with parsed cards
    cards = result.cards;
    cardIdCounter = result.maxId;

    // Update UI
    renderEditor();
    updatePreview();

    showToast(
      `Successfully imported ${result.cards.length} card(s)!`,
      "success"
    );

    // Switch back to preview view
    if (isCodeView) {
      const toggleBtn = document.querySelector(
        '.panel-header button[onclick="toggleView(event)"]'
      );
      toggleView({ target: toggleBtn });
      // Update the main toggle button label
      if (toggleBtn) {
        toggleBtn.textContent = "Toggle Code View";
      }
    }
  } catch (error) {
    showToast("Error parsing HTML: " + error.message, "error");
  }
}

// Clear textarea
function clearTextarea() {
  const codeTextarea = document.getElementById("codeTextarea");
  codeTextarea.value = "";
  codeTextarea.focus();
}

// Mobile menu functions
function toggleMobileMenu() {
  const editorPanel = document.querySelector(".editor-panel");
  const mobileOverlay = document.getElementById("mobileOverlay");

  editorPanel.classList.toggle("mobile-open");
  mobileOverlay.classList.toggle("show");
}

function closeMobileMenu() {
  const editorPanel = document.querySelector(".editor-panel");
  const mobileOverlay = document.getElementById("mobileOverlay");

  editorPanel.classList.remove("mobile-open");
  mobileOverlay.classList.remove("show");
}

// Close mobile menu when clicking on a link inside the editor
document.addEventListener("click", function (event) {
  if (
    window.innerWidth <= 768 &&
    event.target.closest(".editor-panel") &&
    event.target.tagName === "BUTTON"
  ) {
    // Add a small delay to allow the button action to complete
    setTimeout(closeMobileMenu, 100);
  }
});

// Handle window resize
window.addEventListener("resize", function () {
  if (window.innerWidth > 768) {
    closeMobileMenu();
  }
});

// Add touch gesture support for mobile menu
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener("touchstart", function (event) {
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
});

document.addEventListener("touchmove", function (event) {
  if (window.innerWidth <= 768) {
    const touchX = event.touches[0].clientX;
    const touchY = event.touches[0].clientY;
    const diffX = touchX - touchStartX;
    const diffY = touchY - touchStartY;

    // Detect horizontal swipe (more horizontal than vertical movement)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      const editorPanel = document.querySelector(".editor-panel");
      const isMenuOpen = editorPanel.classList.contains("mobile-open");

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
document.addEventListener("DOMContentLoaded", init);
