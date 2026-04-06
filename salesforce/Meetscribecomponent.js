import { LightningElement, track } from 'lwc';
import { createErrorString, showNotification } from 'c/utility';
import appResource from '@salesforce/resourceUrl/MeetScribe';
import createMeetingRecord from '@salesforce/apex/MeetScribeController.createMeetingRecord';
import sendEmail from '@salesforce/apex/MeetScribeController.sendEmail';
import searchContactsAndLeads from '@salesforce/apex/MeetScribeController.searchContactsAndLeads';

// Custom Labels — set these in Salesforce Setup → Custom Labels
import WebSocketEndpoint from '@salesforce/label/c.MeetScribeWebSocketUrl';
import AppTitle from '@salesforce/label/c.MeetScribeAppTitle';
import SetupTitle from '@salesforce/label/c.MeetScribeSetupTitle';
import SetupTagLine from '@salesforce/label/c.MeetScribeTagLine';
import StartMeetingBtn from '@salesforce/label/c.MeetScribeStartBtn';
import StopMeetingBtn from '@salesforce/label/c.MeetScribeStopBtn';
import ConnectingTitle from '@salesforce/label/c.MeetScribeConnectingMessage';
import LiveTranscriptTitle from '@salesforce/label/c.MeetScribeLiveTranscriptTitle';
import SummaryLabel from '@salesforce/label/c.MeetScribeSummaryTitle';
import CallTitleLabel from '@salesforce/label/c.MeetScribeCallTitle';
import SendEmailLabel from '@salesforce/label/c.MeetScribeSendEmailTitle';
import GeneratingLabel from '@salesforce/label/c.MeetScribeGeneratingTitle';
import RecordedMsg from '@salesforce/label/c.MeetScribeRecordedMessage';
import MeetingDetailMsg from '@salesforce/label/c.MeetScribeMeetingDetail';
import EmailSentMsg from '@salesforce/label/c.MeetScribeEmailSent';
import DisclaimerEnglish from '@salesforce/label/c.MeetScribeDisclaimerEnglish';
import DisclaimerHindi from '@salesforce/label/c.MeetScribeDisclaimerHindi';

export default class MeetScribeComponent extends LightningElement {
    label = {
        WebSocketEndpoint,
        AppTitle,
        SetupTitle,
        SetupTagLine,
        StartMeetingBtn,
        StopMeetingBtn,
        ConnectingTitle,
        LiveTranscriptTitle,
        SummaryLabel,
        CallTitleLabel,
        SendEmailLabel,
        GeneratingLabel,
        RecordedMsg,
        MeetingDetailMsg,
        EmailSentMsg,
        DisclaimerEnglish,
        DisclaimerHindi,
    };

    // ---- Tracked state ----
    @track transcription = '';
    @track meetingSummary = '';
    @track emails = [];
    @track lookupSearchResults = [];
    @track selectedRecords = [];
    @track lookupSearchKey = '';
    @track isLookupLoading = false;
    @track showLookupDropdown = false;

    // ---- Untracked flags ----
    isChecked = false;
    isRecordingStarted = false;
    isSummaryDone = false;
    isConnecting = false;
    isSpeaking = false;
    isEditing = false;
    isProcessing = false;
    showModal = false;

    // ---- Edit state ----
    editedSummary = '';
    editedCallTitle = '';
    callTitle = '';
    currentInput = '';

    // ---- Session data ----
    callRecordingId = '';
    createdRecordId = '';
    callStartTime = null;
    callEndTime = null;

    // ---- Audio/WebSocket ----
    bars = [];
    mediaRecorder;
    socket;
    wakeLock;

    // ---- Assets (set via Static Resource named MeetScribe) ----
    micImgUrl = appResource + '/assets/mic.png';
    penIconUrl = appResource + '/assets/pen.png';

    // ---- Disclaimer messages from Custom Labels ----
    englishMessage = DisclaimerEnglish;
    hindiMessage = DisclaimerHindi;

    // ── Lifecycle ──────────────────────────────────────────────
    connectedCallback() {
        this._createBars();
    }

    _createBars() {
        this.bars = Array.from({ length: 18 }).map((_, i) => ({
            id: i,
            style: `animation-delay:${i * 0.1}s; height:${10 + 2 * 2}px;`,
        }));
    }

    // ── Wake Lock ──────────────────────────────────────────────
    async _requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                this.wakeLock.addEventListener('release', () => {});
            }
        } catch {
            this.dispatchEvent(showNotification('Warning', 'Please keep screen on during the meeting.', 'warning', 'sticky'));
        }
    }

    async _releaseWakeLock() {
        try {
            if (this.wakeLock) { await this.wakeLock.release(); this.wakeLock = null; }
        } catch { /* ignore */ }
    }

    // ── Recording start/stop ───────────────────────────────────
    startRecording() {
        if (!this.hasSelectedRecords) {
            this.dispatchEvent(showNotification('Warning', 'Please select a Participant before starting.', 'error', 'sticky'));
            return;
        }
        if (!this.isChecked) {
            this.dispatchEvent(showNotification('Warning', 'Please confirm recording consent before starting.', 'error', 'sticky'));
            return;
        }
        this.showModal = true;
    }

    stopRecording() {
        this.isProcessing = true;
        this.isRecordingStarted = false;
        this.callEndTime = new Date().toISOString();
        if (this.mediaRecorder?.state !== 'inactive') {
            this.mediaRecorder.stop();
            this._releaseWakeLock();
        }
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ end: true }));
        }
    }

    async _startMedia() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.socket = new WebSocket(this.label.WebSocketEndpoint);
            this._detectVoice(stream);
            this._socketHandle();
            this._requestWakeLock();
        } catch (error) {
            this.dispatchEvent(showNotification('Error', createErrorString(error), 'error', 'sticky'));
        }
    }

    _detectVoice(stream) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioCtx();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);
        const THRESHOLD = 10;
        const detect = () => {
            analyser.getByteFrequencyData(dataArray);
            const vol = dataArray.reduce((a, b) => a + b) / dataArray.length;
            this.isSpeaking = vol > THRESHOLD;
            requestAnimationFrame(detect);
        };
        detect();
    }

    _socketHandle() {
        this.socket.onopen = () => {
            this.isRecordingStarted = true;
            this.isConnecting = false;
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && this.socket.readyState === WebSocket.OPEN) {
                    event.data.arrayBuffer().then((buffer) => this.socket.send(buffer));
                }
            };
            this.mediaRecorder.start(1000);
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.transcript) {
                this.transcription += '\n' + data.transcript + ' ';
            } else if (data.type === 'mom') {
                // Strip any accidental markdown fences from model output
                const cleaned = data.content
                    .replace(/^```json\s*/i, '')
                    .replace(/^```\s*/i, '')
                    .replace(/\s*```$/, '')
                    .trim();
                const parsed = JSON.parse(cleaned);
                this.isSummaryDone = true;
                this.meetingSummary = parsed.mom;
                this.callTitle = parsed.title;
                this._createRecord(data);
                this.socket.close();
                setTimeout(() => { this.isProcessing = false; }, 0);
            } else if (data.type === 'error') {
                this.dispatchEvent(showNotification('Error', JSON.stringify(data), 'error', 'sticky'));
            }
        };

        this.socket.onerror = (error) => {
            this.dispatchEvent(showNotification('Error', createErrorString(error), 'error', 'sticky'));
        };

        this.socket.onclose = () => {
            this.isRecordingStarted = false;
            this.isProcessing = false;
        };
    }

    _speakConfirmation() {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(this.label.RecordedMsg);
            utterance.lang = 'en-US';
            const pickVoice = () => {
                const voices = speechSynthesis.getVoices();
                const preferred = voices.find((v) =>
                    v.name.includes('Google') ||
                    v.name.includes('Natural') ||
                    v.name.includes('Premium') ||
                    v.name.includes('Enhanced') ||
                    (v.lang === 'en-US' && !v.localService)
                ) || voices.find((v) => v.lang === 'en-US');
                if (preferred) utterance.voice = preferred;
            };
            speechSynthesis.getVoices().length > 0 ? pickVoice() : (speechSynthesis.onvoiceschanged = pickVoice);
            speechSynthesis.speak(utterance);
        }
    }

    // ── Edit handlers ──────────────────────────────────────────
    handleEditChange()            { this.isEditing = true; }
    cancelEdit()                  { this.isEditing = false; }
    handleSummaryChange(event)    { this.editedSummary = event.target.value; }
    handleTitleChange(event)      { this.editedCallTitle = event.target.value; }

    handleSave() {
        if (this.editedSummary)   this.meetingSummary = this.editedSummary;
        if (this.editedCallTitle) this.callTitle = this.editedCallTitle;
        this.isEditing = false;
    }

    // ── Email handlers ─────────────────────────────────────────
    handleInput(event)  { this.currentInput = event.target.value; }
    validateEmail(e)    { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

    handleKeyDown(event) {
        if (event.key === ',' || event.key === 'Enter') {
            event.preventDefault();
            const email = this.currentInput.trim().replace(/,$/, '');
            if (this.validateEmail(email)) {
                this.emails = [...this.emails, email];
                this.currentInput = '';
            }
        }
    }

    handleRemove(event) {
        this.emails = this.emails.filter((e) => e !== event.target.name);
    }

    // ── Salesforce record creation ─────────────────────────────
    _createRecord(data) {
        if (data.recordingid) {
            this.callRecordingId = data.recordingid.split('/').pop();
        }
        const meetingData = {
            meetingTitle: this.callTitle,
            recordingId: this.callRecordingId,
            meetingSummary: this.meetingSummary,
            participantId: this.selectedRecords?.[0]?.id ?? null,
            callStartTime: this.callStartTime,
            callEndTime: this.callEndTime,
        };
        createMeetingRecord({ meetingData })
            .then((recordId) => {
                this.createdRecordId = recordId;
                this.dispatchEvent(showNotification('Success', this.label.MeetingDetailMsg, 'success', 'dismissable'));
            })
            .catch((error) => {
                this.dispatchEvent(showNotification('Error', createErrorString(error), 'error', 'sticky'));
            });
    }

    sendMeetingEmail() {
        if (!this.emails.length) {
            this.dispatchEvent(showNotification('Warning', 'Please add at least one email address.', 'warning', 'sticky'));
            return;
        }
        sendEmail({
            recordId: this.createdRecordId,
            emailAddresses: this.emails,
            subject: `MeetScribe – ${this.callTitle}`,
            meetingSummary: this.meetingSummary,
        })
            .then(() => {
                this.dispatchEvent(showNotification('Success', this.label.EmailSentMsg, 'success', 'dismissable'));
                this._resetState();
                this._dispatchRecordingEvent(true);
            })
            .catch((error) => {
                this.dispatchEvent(showNotification('Error', createErrorString(error), 'error', 'sticky'));
                this._resetState();
            });
    }

    _resetState() {
        Object.assign(this, {
            isRecordingStarted: false, isSummaryDone: false, isConnecting: false,
            isSpeaking: false, isEditing: false, isProcessing: false,
            isChecked: false, showModal: false,
            selectedRecords: [], emails: [], lookupSearchResults: [],
            currentInput: '', transcription: '', meetingSummary: '',
            callTitle: '', editedCallTitle: '', editedSummary: '',
            callRecordingId: '', createdRecordId: '',
            lookupSearchKey: '', showLookupDropdown: false,
        });
    }

    _dispatchRecordingEvent(value) {
        this.dispatchEvent(new CustomEvent('recording', { detail: value }));
    }

    // ── Modal ──────────────────────────────────────────────────
    handleCancel() { this.showModal = false; }

    handleConfirm() {
        this.showModal = false;
        this.isSummaryDone = false;
        this.isConnecting = true;
        this.meetingSummary = '';
        this.transcription = '';
        this.callStartTime = new Date().toISOString();
        this._speakConfirmation();
        this._startMedia();
        this._dispatchRecordingEvent(false);
    }

    // ── Lookup ─────────────────────────────────────────────────
    searchTimeout;

    handleLookupSearch(event) {
        const key = event.target.value;
        this.lookupSearchKey = key;
        clearTimeout(this.searchTimeout);
        if (!key || key.length < 2) {
            this.lookupSearchResults = [];
            this.showLookupDropdown = false;
            return;
        }
        this.searchTimeout = setTimeout(() => this._performSearch(key), 300);
    }

    async _performSearch(key) {
        this.isLookupLoading = true;
        this.showLookupDropdown = true;
        try {
            const results = await searchContactsAndLeads({ searchKey: key });
            const selectedIds = this.selectedRecords.map((r) => r.id);
            this.lookupSearchResults = results.filter((r) => !selectedIds.includes(r.id));
        } catch (error) {
            this.dispatchEvent(showNotification('Error', createErrorString(error), 'error', 'sticky'));
            this.lookupSearchResults = [];
        } finally {
            this.isLookupLoading = false;
        }
    }

    handleLookupSelect(event) {
        const id = event.currentTarget.dataset.id;
        const record = this.lookupSearchResults.find((r) => r.id === id);
        if (record) {
            this.selectedRecords = [...this.selectedRecords, record];
            this.lookupSearchKey = '';
            this.lookupSearchResults = [];
            this.showLookupDropdown = false;
        }
    }

    handleRemoveSelected(event) {
        const id = event.currentTarget.name;
        this.selectedRecords = this.selectedRecords.filter((r) => r.id !== id);
    }

    handleLookupFocus() {
        if (this.lookupSearchKey?.length >= 2 && this.lookupSearchResults.length > 0) {
            this.showLookupDropdown = true;
        }
    }

    handleLookupBlur() {
        setTimeout(() => { this.showLookupDropdown = false; }, 200);
    }

    // ── Consent ────────────────────────────────────────────────
    toggleConsent() {
        this.isChecked = !this.isChecked;
        this.dispatchEvent(new CustomEvent('consentchange', {
            detail: { consented: this.isChecked },
            bubbles: true,
            composed: true,
        }));
    }

    // ── Getters ────────────────────────────────────────────────
    get hasSelectedRecords()  { return this.selectedRecords?.length > 0; }
    get hasSearchResults()    { return this.lookupSearchResults?.length > 0; }
    get noResultsFound() {
        return this.lookupSearchKey?.length >= 2 &&
               !this.isLookupLoading &&
               this.lookupSearchResults.length === 0;
    }
    get consentCardClass() {
        return `ms-consent-card ${this.isChecked ? 'ms-consent-card--active' : ''}`;
    }
    get checkboxClass() {
        return `ms-checkbox ${this.isChecked ? 'ms-checkbox--checked' : ''}`;
    }
}
