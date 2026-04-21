import React, { useEffect, useMemo, useRef, useState } from 'react';

const SYBIL_HERO = '/assets/128.png';

const VALID = {
    fullName: 'Fred Flintstone',
    policyNumber: '12345A',
    annualPremium: '59.95',
    billingCode: '1234',
};

const RATE_GRID = {
    policyType: 'Life',
    coverages: [1000, 2500, 5000, 10000, 20000, 50000, 100000],
    quarterlyPremiums: ['$4.95', '$12.38', '$24.75', '$49.50', '$99.00', '$247.50', '$495.00'],
};

let nextId = 1;
function makeId() {
    return `msg-${nextId++}`;
}

function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

function buildInitialMessages() {
    return [
        {
            id: makeId(),
            role: 'assistant',
            text: `${getTimeGreeting()}. I'm Sybil, the automated assistant at American Gulf. How can I help you?   For faster connection scan the QR code on your most recent premium notice.`,
            options: [
                'Pay my insurance premium',
                'Lookup my insurance account',
                'Get an insurance quote',
            ],
        },
    ];
}

function playThinkingTones() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const now = context.currentTime;

    const notes = [
        { freq: 392.0, start: 0.0, duration: 0.13 },
        { freq: 523.25, start: 0.18, duration: 0.16 },
        { freq: 440.0, start: 0.4, duration: 0.11 },
        { freq: 392.0, start: 0.58, duration: 0.16 },
    ];

    notes.forEach((note, index) => {
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = index === 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.start);

        gain.gain.setValueAtTime(0.0001, now + note.start);
        gain.gain.exponentialRampToValueAtTime(0.05, now + note.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

        osc.connect(gain);
        gain.connect(context.destination);

        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration + 0.03);
    });

    window.setTimeout(() => {
        context.close().catch(() => { });
    }, 1200);
}

export default function App() {
    const [messages, setMessages] = useState(buildInitialMessages);
    const [stage, setStage] = useState('mainMenu');
    const [isThinking, setIsThinking] = useState(false);
    const [form, setForm] = useState({
        fullName: '',
        policyNumber: '',
        annualPremium: '',
        billingCode: '',
        dob: '',
        gender: '',
    });

    const endRef = useRef(null);
    const timersRef = useRef([]);

    const currentPrompt = useMemo(() => {
        if (isThinking) return 'Sybil is thinking...';
        return 'Choose an option above to continue...';
    }, [isThinking]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    useEffect(() => {
        return () => {
            timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
        };
    }, []);

    function addUserMessage(text) {
        setMessages((current) => [...current, { id: makeId(), role: 'user', text }]);
    }

    function addAssistantMessage(message) {
        setMessages((current) => [...current, { id: makeId(), role: 'assistant', ...message }]);
    }

    function queueAssistantReply(message, nextStage, delay = 1100) {
        setIsThinking(true);
        playThinkingTones();

        const timerId = window.setTimeout(() => {
            addAssistantMessage(message);
            setStage(nextStage);
            setIsThinking(false);
        }, delay);

        timersRef.current.push(timerId);
    }

    function resetChat() {
        timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
        timersRef.current = [];
        nextId = 1;
        setMessages(buildInitialMessages());
        setStage('mainMenu');
        setIsThinking(false);
        setForm({
            fullName: '',
            policyNumber: '',
            annualPremium: '',
            billingCode: '',
            dob: '',
            gender: '',
        });
    }

    function handleMainMenuSelection(option) {
        if (isThinking) return;
        addUserMessage(option);

        if (option === 'Get an insurance quote') {
            queueAssistantReply(
                {
                    text: 'Please answer the following questions so I can show you sample pricing.',
                    showQuoteForm: true,
                },
                'quoteForm'
            );
            return;
        }

        queueAssistantReply(
            {
                text: `Let's get you connected. Please choose an option:`,
                options: [
                    'Log on with my email address and password',
                    'Log on with information from my last billing notice',
                ],
            },
            'connectMenu'
        );
    }

    function handleConnectSelection(option) {
        if (isThinking) return;
        addUserMessage(option);

        if (option === 'Log on with my email address and password') {
            queueAssistantReply(
                {
                    text: 'I am sorry, but that option is not currently available.',
                    options: ['Back', 'Start Over'],
                },
                'existingUnavailable'
            );
            return;
        }

        queueAssistantReply(
            {
                text: 'Please answer the following questions. You must get them exactly right to prove you are the policy payor.',
                showVerificationForm: true,
            },
            'verifyForm'
        );
    }

    function handleNextActionSelection(option) {
        if (isThinking) return;
        addUserMessage(option);

        queueAssistantReply(
            {
                text: 'I am sorry, but that option is not currently available in this demo.',
                options: ['Start Over'],
            },
            'nextActionUnavailable'
        );
    }

    function handleSimpleOption(option) {
        if (isThinking) return;
        addUserMessage(option);

        if (option === 'Back to main menu') {
            resetChat();
            return;
        }

        if (option === 'Back') {
            queueAssistantReply(
                {
                    text: `Let's get you connected. Please choose an option:`,
                    options: [
                        'Log on with my email address and password',
                        'Log on with information from my last billing notice',
                    ],
                },
                'connectMenu'
            );
            return;
        }

        if (option === 'Try again') {
            setForm((current) => ({
                ...current,
                fullName: '',
                policyNumber: '',
                annualPremium: '',
                billingCode: '',
            }));
            queueAssistantReply(
                {
                    text: 'Please answer the following questions. You must get them exactly right to prove you are the policy payor.',
                    showVerificationForm: true,
                },
                'verifyForm'
            );
            return;
        }

        if (option === 'Get another quote') {
            setForm((current) => ({
                ...current,
                dob: '',
                gender: '',
            }));
            queueAssistantReply(
                {
                    text: 'Please answer the following questions so I can show you sample pricing.',
                    showQuoteForm: true,
                },
                'quoteForm'
            );
            return;
        }

        if (option === 'Start Over') {
            resetChat();
        }
    }

    function updateField(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    function handleVerificationSubmit(event) {
        event.preventDefault();
        if (isThinking) return;

  
        const ok =
            form.fullName.trim() === VALID.fullName &&
            form.policyNumber.trim() === VALID.policyNumber &&
            form.annualPremium.trim() === VALID.annualPremium &&
            form.billingCode.trim() === VALID.billingCode;

        if (!ok) {
            queueAssistantReply(
                {
                    text: 'I am sorry, but I could not verify that you are the policy owner.',
                    options: ['Try again', 'Start Over'],
                },
                'notVerified'
            );
            return;
        }

        queueAssistantReply(
            {
                text: 'Thank you. Your basic policy information is shown here.',
                policyCard: {
                    owner: 'Fred Flintstone',
                    policyNumber: '12345A',
                    paidToDate: '6/1/2026',
                    quarterlyPremium: '$14.98',
                    semiAnnualPremium: '$29.98',
                    annualPremium: '$59.95',
                    status: 'Active',
                },
                followUpText: 'What would you like to do next?',
                options: [
                    'View the details of my coverage',
                    'Pay my quarterly premium of $14.98',
                    'Pay my semi-annual premium of $29.98',
                    'Pay my annual premium of $59.95',
                ],
            },
            'verified'
        );
    }

    function handleQuoteSubmit(event) {
        event.preventDefault();
        if (isThinking) return;

     
        queueAssistantReply(
            {
                text: 'Here are sample rates for the new insured.',
                quoteSummary: {
                    dob: form.dob,
                    gender: form.gender,
                },
                rateGrid: RATE_GRID,
                options: ['Get another quote', 'Start Over'],
            },
            'quoteResults'
        );
    }

    function handleOptionClick(option) {
        if (stage === 'mainMenu') {
            handleMainMenuSelection(option);
            return;
        }

        if (stage === 'connectMenu') {
            handleConnectSelection(option);
            return;
        }

        if (stage === 'verified') {
            handleNextActionSelection(option);
            return;
        }

        if (
            [
                'existingUnavailable',
                'notVerified',
                'nextActionUnavailable',
                'quoteResults',
            ].includes(stage)
        ) {
            handleSimpleOption(option);
        }
    }

    const canSubmitVerification =
        stage === 'verifyForm' &&
        !isThinking &&
        form.fullName.trim() &&
        form.policyNumber.trim() &&
        form.annualPremium.trim() &&
        form.billingCode.trim();

    const canSubmitQuote =
        stage === 'quoteForm' &&
        !isThinking &&
        form.dob.trim() &&
        form.gender.trim();

    return (
        <div className="app-shell">
            <div className="chat-window">
                <header className="chat-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <img src={SYBIL_HERO} alt="Sybil" className="header-avatar" />
                        <div className="header-title-block">
                            <p className="eyebrow">American Gulf</p>
                            <h1>Sybil, Automated Assistant</h1>
                        </div>
                    </div>

                    <button className="reset-button" onClick={resetChat} type="button">
                        Start Over
                    </button>
                </header>

                <main className="chat-body">
                    {messages.map((message, index) => {
                        const isLastMessage = index === messages.length - 1;
                        return (
                            <div key={message.id} className={`message-row ${message.role}`}>
                                <div className="message-group">
                                    {message.text ? (
                                        <div className={`message-bubble ${message.role}`}>
                                            {message.text.split('\n').map((line, lineIndex) => (
                                                <p key={lineIndex}>{line || <span>&nbsp;</span>}</p>
                                            ))}
                                        </div>
                                    ) : null}

                                    {message.showVerificationForm ? (
                                        <div className="verify-panel">
                                            <form className="verify-form" onSubmit={handleVerificationSubmit}>
                                                <label>
                                                    <span>What is the first and last name on your billing notice.</span>
                                                    <input
                                                        type="text"
                                                        value={form.fullName}
                                                        onChange={(e) => updateField('fullName', e.target.value)}
                                                        disabled={stage !== 'verifyForm' || isThinking || !isLastMessage}
                                                    />
                                                </label>

                                                <label>
                                                    <span>What is the policy number including any letters</span>
                                                    <input
                                                        type="text"
                                                        value={form.policyNumber}
                                                        onChange={(e) => updateField('policyNumber', e.target.value)}
                                                        disabled={stage !== 'verifyForm' || isThinking || !isLastMessage}
                                                    />
                                                </label>

                                                <label>
                                                    <span>What is the annual premium</span>
                                                    <input
                                                        type="text"
                                                        value={form.annualPremium}
                                                        onChange={(e) => updateField('annualPremium', e.target.value)}
                                                        disabled={stage !== 'verifyForm' || isThinking || !isLastMessage}
                                                    />
                                                </label>

                                                <label>
                                                    <span>What is the 4 digit access code printed on your most recent billinggit commit -m "Fix quote flow and remove form echo" notice.</span>
                                                    <input
                                                        type="text"
                                                        value={form.billingCode}
                                                        onChange={(e) => updateField('billingCode', e.target.value)}
                                                        disabled={stage !== 'verifyForm' || isThinking || !isLastMessage}
                                                    />
                                                </label>

                                                <div className="verify-actions">
                                                    <button className="design-ok-button" type="submit" disabled={!canSubmitVerification || !isLastMessage}>
                                                        Verify
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    ) : null}

                                    {message.showQuoteForm ? (
                                        <div className="verify-panel">
                                            <form className="verify-form" onSubmit={handleQuoteSubmit}>
                                                <label>
                                                    <span>What is the new insured&apos;s date of birth?</span>
                                                    <input
                                                        type="text"
                                                        placeholder="mm/dd/yyyy"
                                                        value={form.dob}
                                                        onChange={(e) => updateField('dob', e.target.value)}
                                                        disabled={stage !== 'quoteForm' || isThinking || !isLastMessage}
                                                    />
                                                </label>

                                                <label>
                                                    <span>Is the new insured male or female?</span>
                                                    <div className="options-wrap">
                                                        {['Male', 'Female'].map((g) => (
                                                            <button
                                                                key={g}
                                                                type="button"
                                                                className="option-chip"
                                                                onClick={() => updateField('gender', g)}
                                                                disabled={stage !== 'quoteForm' || isThinking || !isLastMessage}
                                                                style={{
                                                                    background: form.gender === g ? '#4f46e5' : undefined,
                                                                    color: form.gender === g ? 'white' : undefined,
                                                                    borderColor: form.gender === g ? '#4f46e5' : undefined
                                                                }}
                                                            >
                                                                {g}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </label>

                                                <div className="verify-actions">
                                                    <button className="design-ok-button" type="submit" disabled={!canSubmitQuote || !isLastMessage}>
                                                        Show Pricing
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    ) : null}

                                    {message.policyCard ? (
                                        <div className="policy-card">
                                            <div><strong>Policy Owner:</strong> {message.policyCard.owner}</div>
                                            <div><strong>Policy Number:</strong> {message.policyCard.policyNumber}</div>
                                            <div><strong>Paid To Date:</strong> {message.policyCard.paidToDate}</div>
                                            <div><strong>Quarterly Premium:</strong> {message.policyCard.quarterlyPremium}</div>
                                            <div><strong>Semi Annual Premium:</strong> {message.policyCard.semiAnnualPremium}</div>
                                            <div><strong>Annual Premium:</strong> {message.policyCard.annualPremium}</div>
                                            <div><strong>Status:</strong> {message.policyCard.status}</div>
                                        </div>
                                    ) : null}

                                    {message.quoteSummary ? (
                                        <div className="policy-card">
                                            <div><strong>Date of Birth:</strong> {message.quoteSummary.dob}</div>
                                            <div><strong>Gender:</strong> {message.quoteSummary.gender}</div>
                                        </div>
                                    ) : null}

                                    {message.rateGrid ? (
                                        <div className="policy-card" style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ fontWeight: 700, padding: '8px 10px' }}>Policy Type</td>
                                                        {message.rateGrid.coverages.map((coverage) => (
                                                            <td key={`type-${coverage}`} style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                                {message.rateGrid.policyType}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                    <tr>
                                                        <td style={{ fontWeight: 700, padding: '8px 10px' }}>Coverage</td>
                                                        {message.rateGrid.coverages.map((coverage) => (
                                                            <td key={`coverage-${coverage}`} style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                                ${coverage.toLocaleString()}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                    <tr>
                                                        <td style={{ fontWeight: 700, padding: '8px 10px' }}>Quarterly Premium</td>
                                                        {message.rateGrid.quarterlyPremiums.map((premium) => (
                                                            <td key={`premium-${premium}`} style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                                {premium}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : null}

                                    {message.followUpText ? (
                                        <div className={`message-bubble ${message.role}`}>
                                            <p>{message.followUpText}</p>
                                        </div>
                                    ) : null}

                                    {message.options?.length ? (
                                        <div className="options-wrap">
                                            {message.options.map((option) => (
                                                <button
                                                    key={option}
                                                    className="option-chip"
                                                    onClick={() => handleOptionClick(option)}
                                                    disabled={isThinking || !isLastMessage}
                                                    type="button"
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}

                    {isThinking ? (
                        <div className="message-row assistant">
                            <div className="message-group">
                                <div className="message-bubble assistant thinking-bubble" aria-label="Sybil is thinking">
                                    <div className="thinking-track">
                                        <span className="thinking-dot dot-1" />
                                        <span className="thinking-dot dot-2" />
                                        <span className="thinking-dot dot-3" />
                                        <span className="thinking-dot dot-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className="chat-input read-only-input">
                        <input type="text" value="" readOnly placeholder={currentPrompt} disabled />
                        <button type="button" disabled>
                            Send
                        </button>
                    </div>

                    <div ref={endRef} />
                </main>
            </div>
        </div>
    );
}