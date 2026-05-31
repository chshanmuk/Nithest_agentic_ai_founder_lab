// Global state to store the user profile and chat history
let userProfileState = null;
let chatHistoryState = [];

// Helper to determine base API URL dynamically (handles direct file:// execution and standard hosting)
const getApiUrl = (endpoint) => {
    if (window.location.protocol === 'file:') {
        return `http://localhost:5000${endpoint}`;
    }
    return endpoint;
};

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Navbar blur on scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(2, 2, 3, 0.85)';
        navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.5)';
    } else {
        navbar.style.background = 'rgba(2, 2, 3, 0.7)';
        navbar.style.boxShadow = 'none';
    }
});

// Scroll Reveal Animation (Intersection Observer)
const revealElements = document.querySelectorAll('.reveal');

const revealOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
};

const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
        }
    });
}, revealOptions);

revealElements.forEach(el => {
    revealObserver.observe(el);
});

// Toast Notification helper
function showToast(message, isError = false) {
    const toast = document.getElementById('shareToast');
    const toastText = toast.querySelector('span:not(.toast-icon)');
    const toastIcon = toast.querySelector('.toast-icon');
    
    toastText.textContent = message;
    
    if (isError) {
        toast.classList.add('error-toast');
        toastIcon.textContent = '✕';
        toastIcon.style.color = '#FF453A';
    } else {
        toast.classList.remove('error-toast');
        toastIcon.textContent = '✓';
        toastIcon.style.color = '#34C759';
    }
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Form Handling & Dynamic AI Content Generation
const form = document.getElementById('futureForm');
const generateBtn = document.getElementById('generateBtn');
const loadingState = document.getElementById('loadingState');
const resultSection = document.getElementById('result-section');
const formError = document.getElementById('formError');

// Output elements
const dynMessage = document.getElementById('dynamicMessage');
const dynIdentity = document.getElementById('dynamicIdentity');
const dynMoves = document.getElementById('dynamicMoves');
const dynHabit = document.getElementById('dynamicHabit');
const dynWarning = document.getElementById('dynamicWarning');
const dynMantra = document.getElementById('dynamicMantra');

// Loading messages sequence to build premium suspense
const loadingMessages = [
    "Establishing link with the future...",
    "Analyzing your current trajectory...",
    "Calculating potential timeline shifts...",
    "Synthesizing future memories...",
    "Drafting advice from your older self..."
];

let loadingInterval = null;

function startLoadingAnimation() {
    const textEl = loadingState.querySelector('p') || document.createElement('p');
    let index = 0;
    textEl.textContent = loadingMessages[0];
    
    loadingInterval = setInterval(() => {
        index = (index + 1) % loadingMessages.length;
        textEl.textContent = loadingMessages[index];
    }, 2000);
}

function stopLoadingAnimation() {
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
    }
}

// Escape HTML to prevent basic XSS
const escapeHTML = (str) => {
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get values
    const name = escapeHTML(document.getElementById('userName').value.trim());
    const age = escapeHTML(document.getElementById('userAge').value.trim());
    const goal = escapeHTML(document.getElementById('userGoal').value.trim());
    const struggle = escapeHTML(document.getElementById('userStruggle').value.trim());
    const timeline = escapeHTML(document.getElementById('userTimeline').value.trim());
    const tone = document.getElementById('userTone').value;

    // Simple validation
    if (!name || !age || !goal || !struggle || !timeline || !tone) {
        formError.textContent = "Please fill out all fields to continue.";
        formError.style.display = 'block';
        return;
    }

    formError.style.display = 'none';

    // UI Transition to Loading
    generateBtn.disabled = true;
    generateBtn.style.display = 'none';
    loadingState.style.display = 'block';
    resultSection.style.display = 'none';
    
    // Hide chat container in case it was open
    document.getElementById('chat-section-container').style.display = 'none';

    startLoadingAnimation();

    try {
        // Call backend API
        const response = await fetch(getApiUrl("/api/generate-futureme"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                age,
                goal,
                struggle,
                oneYearVision: timeline,
                tone
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to generate FutureMe.");
        }

        // Save states
        userProfileState = { name, age, goal, struggle, oneYearVision: timeline, tone };
        chatHistoryState = []; // Reset chat history for the new generation
        
        // Populate results
        populateResults(result.data);

        // Hide loading
        stopLoadingAnimation();
        loadingState.style.display = 'none';
        
        // Show result section
        resultSection.style.display = 'block';
        
        // Setup initial chat preview/instructions inside the log
        initChatLog();

        // Scroll to result smoothly
        setTimeout(() => {
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);

    } catch (err) {
        console.error("API Error:", err);
        stopLoadingAnimation();
        loadingState.style.display = 'none';
        generateBtn.style.display = 'block';
        generateBtn.disabled = false;
        
        formError.textContent = "FutureMe could not respond right now. Try again.";
        formError.style.display = 'block';
        showToast("Error establishing connection. Please try again.", true);
    }
});

function populateResults(data) {
    // Populate DOM elements safely
    dynMessage.innerHTML = `"${escapeHTML(data.message)}"`;
    dynIdentity.textContent = data.futureIdentity;
    
    // Clear & Populate Next Moves
    dynMoves.innerHTML = "";
    if (data.nextMoves && Array.isArray(data.nextMoves)) {
        data.nextMoves.forEach(move => {
            const li = document.createElement('li');
            li.textContent = move;
            dynMoves.appendChild(li);
        });
    }
    
    // Habit
    dynHabit.textContent = data.habit;
    
    // Warning
    dynWarning.textContent = data.warning;
    
    // Mantra
    dynMantra.textContent = data.mantra;
}

// Copy Result Functionality
const copyBtn = document.getElementById('copyBtn');
copyBtn.addEventListener('click', () => {
    if (!userProfileState) return;
    
    const message = dynMessage.textContent;
    const identity = dynIdentity.textContent;
    const moves = Array.from(dynMoves.querySelectorAll('li')).map(li => `- ${li.textContent}`).join('\n');
    const habit = dynHabit.textContent;
    const warning = dynWarning.textContent;
    const mantra = dynMantra.textContent;
    
    const copyText = `✨ FutureMe Reflection Guide ✨\n` +
                     `---------------------------------\n` +
                     `👤 Current Profile: ${userProfileState.name} (${userProfileState.age} years old)\n` +
                     `🎯 Vision: ${userProfileState.oneYearVision}\n\n` +
                     `✉️ Message from Future Self:\n${message}\n\n` +
                     `🌟 Future Identity:\n${identity}\n\n` +
                     `🧭 Next 3 Moves:\n${moves}\n\n` +
                     `⚡ Daily Habit to Start Today:\n${habit}\n\n` +
                     `⚠️ Warning from Future Self:\n${warning}\n\n` +
                     `🔮 Daily Mantra:\n${mantra}\n` +
                     `---------------------------------\n` +
                     `Generated with FutureMe (Nitish's Founder Labs)`;

    navigator.clipboard.writeText(copyText)
        .then(() => {
            showToast("FutureMe reflection copied to clipboard!");
        })
        .catch(err => {
            console.error("Clipboard error:", err);
            showToast("Failed to copy. Please manually copy the text.", true);
        });
});

// Regenerate (Scroll back to form)
const regenBtn = document.getElementById('regenBtn');
regenBtn.addEventListener('click', () => {
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Highlight form input with subtle effect
    const firstInput = document.getElementById('userName');
    firstInput.focus();
    
    // Reset buttons
    generateBtn.style.display = 'block';
    generateBtn.disabled = false;
endChat();
});

// Chat Activation
const startChatBtn = document.getElementById('startChatBtn');
const chatSectionContainer = document.getElementById('chat-section-container');

startChatBtn.addEventListener('click', () => {
    chatSectionContainer.style.display = 'block';
    
    setTimeout(() => {
        chatSectionContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('chatInput').focus();
    }, 150);
});

function endChat() {
    chatSectionContainer.style.display = 'none';
    chatHistoryState = [];
}

/* Chat Operations */
const chatLog = document.getElementById('chatLog');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

function initChatLog() {
    chatLog.innerHTML = "";
    
    // Add initial greeting bubble based on the chosen tone
    const greeting = getInitialGreeting(userProfileState.tone, userProfileState.name);
    appendChatBubble("futureme", greeting);
}

function getInitialGreeting(tone, name) {
    switch(tone) {
        case "motivational":
            return `I'm here, ${name}. I have seen what we accomplish, and I'm ready to help you push through the doubts. What's on your mind? Let's unlock our potential.`;
        case "brutally_honest":
            return `Let's keep it real, ${name}. I achieved the 1-year goal because I stopped complaining and started executing. Ask me anything, but expect no sugarcoating. What are we fixing today?`;
        case "calm_mentor":
            return `Hello ${name}. I am here. We arrived at our goals not through stress, but through mindful consistency. Speak to me about what concerns you, and let's find clarity together.`;
        case "ceo_mode":
            return `Ready when you are, ${name}. We need to optimize operations and focus on high-leverage actions. What challenge is slowing down our execution today? Let's solve it.`;
        default:
            return `Hello ${name}. I am the version of you who achieved our goals. How can I guide you today?`;
    }
}

function appendChatBubble(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role === 'user' ? 'chat-user' : 'chat-ai'}`;
    
    const label = document.createElement('span');
    label.className = 'chat-label';
    label.textContent = role === 'user' ? 'You' : 'FutureMe';
    
    const messageText = document.createTextNode(text);
    
    bubble.appendChild(label);
    bubble.appendChild(messageText);
    
    chatLog.appendChild(bubble);
    chatLog.scrollTop = chatLog.scrollHeight;
}

// Typing indicator helper
let typingIndicator = null;

function showTypingIndicator() {
    if (typingIndicator) return;
    
    typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-bubble';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        typingIndicator.appendChild(dot);
    }
    
    chatLog.appendChild(typingIndicator);
    chatLog.scrollTop = chatLog.scrollHeight;
}

function removeTypingIndicator() {
    if (typingIndicator) {
        typingIndicator.remove();
        typingIndicator = null;
    }
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const question = chatInput.value.trim();
    if (!question || !userProfileState) return;
    
    // Reset input
    chatInput.value = "";
    
    // Disable inputs
    chatInput.disabled = true;
    chatSendBtn.disabled = true;
    
    // Append user message
    appendChatBubble("user", question);
    
    // Show typing
    showTypingIndicator();
    
    try {
        const response = await fetch(getApiUrl("/api/chat-futureme"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userProfile: userProfileState,
                chatHistory: chatHistoryState,
                question: question
            })
        });
        
        const result = await response.json();
        
        removeTypingIndicator();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || "Chat failed");
        }
        
        // Append response
        appendChatBubble("futureme", result.reply);
        
        // Save history in local state
        chatHistoryState.push({ role: "user", message: question });
        chatHistoryState.push({ role: "futureme", message: result.reply });
        
    } catch(err) {
        console.error("Chat error:", err);
        removeTypingIndicator();
        appendChatBubble("futureme", "FutureMe could not respond right now. Try again.");
        showToast("Chat connection failed. Try again.", true);
    } finally {
        // Re-enable inputs
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
    }
});

// Original mock Share Action toast trigger
const shareBtn = document.getElementById('shareBtn');
shareBtn.addEventListener('click', () => {
    showToast("Your FutureMe moment is ready to share.");
});
