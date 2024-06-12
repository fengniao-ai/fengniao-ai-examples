class FengniaoaiSDK {
    #channel;
    #onMessageCallback;
    #isIframeReady = false;
    #state = 0;
    #retryInterval;
    #maxRetries;
    #timer;
    #debug;
    #logPrefix = "[FengniaoaiSDK]"
    #initData;
    #messageQueue = []
    #isListenerAdded = false

    constructor({ maxRetries = 20, retryInterval = 500, debug = false } = {}) {
        this.#retryInterval = retryInterval;
        this.#maxRetries = maxRetries;
        this.#debug = debug
    }
    #sendMessage = (message) => {
        if (!this.#channel || !this.#channel.port1) {
            throw new Error('Channel is not initialized');
        }
        if (this.#isListenerAdded) {
            this.#log('postMessage', message)
            this.#channel.port1.postMessage(message);
        } else {
            this.#log('save messageQueue', message)
            this.#messageQueue.push(message);
        }
    }
    #addReadyEvent() {
        let messageHandler = (event) => {
            this.#log('Received message:', event.data)
            if (event.source === this.iframe.contentWindow && event.data === 'fengn_iframe_ready') {
                this.#isIframeReady = true;
                // 发送 init 消息给 iframe
                this.iframe.contentWindow.postMessage('init', '*', [this.#channel.port2]);
                // 移除 message 事件监听器
                window.removeEventListener('message', messageHandler);
            }
        };
        window.addEventListener('message', messageHandler);
    }

    #log() {
        if (this.#debug)
            console.log(this.#logPrefix, ...arguments)
    }
    #info() {
        if (this.#debug)
            console.info(this.#logPrefix, ...arguments)
    }
    #warn() {
        if (this.#debug)
            console.warn(this.#logPrefix, ...arguments)
    }
    #error() {
        if (this.#debug)
            console.error(this.#logPrefix, ...arguments)
    }

    /**
     * 初始化 SDK，传入 iframe DOM 并设置消息通道
     * @param {HTMLIFrameElement} iframe - 传入的 iframe DOM 元素
     * @param {Object|null} data - 初始化数据 例子：{ customData: 'x' }
     * @param {Function} onMessageCallback - 收到消息时的回调函数
     */
    init(iframe, data, onMessageCallback) {
        if (!iframe || !(iframe instanceof HTMLIFrameElement)) {
            throw new Error('Invalid iframe element');
        }

        this.iframe = iframe;
        if (data) {
            this.#initData = data
        }
        if (onMessageCallback && typeof onMessageCallback === 'function') {
            this.#onMessageCallback = onMessageCallback;
        }

        this.#channel = new MessageChannel();
        this.#channel.port1.onmessage = (event) => {
            this.#handleMessage(event.data);
        };
        this.#addReadyEvent()

        // 一直发消息直到收到回复
        this.#retryPostMessage('fengn_check_ready', this.#maxRetries);
    }

    // 更换产品图、场景图
    updateData(data = {}) {
        this.#sendMessage({
            event: 'update_data',
            payload: data
        })
    }

    //  销毁
    destroy(){
        this.#log('destroy')
        this.#onMessageCallback = null;
        this.#isIframeReady = false;
        this.#state = 0;
        this.#initData = null;
        this.#messageQueue = []
        this.#isListenerAdded = false
    }

    /**
     * 私有方法，重试发送消息直到成功
     * @param {any} message - 要发送的消息
     * @param {number} retries - 剩余重试次数
     */
    #retryPostMessage(message, retries) {
        if (retries <= 0) {
            this.#error('Failed to send message after multiple attempts');
            return;
        }

        // 尝试发送消息
        this.#log('postMessage: ', message, retries)
        this.iframe.contentWindow.postMessage(message, "*");

        this.#timer && clearTimeout(this.#timer)
        // 设置定时器检查 iframe 是否设置了事件监听器
        this.#timer = setTimeout(() => {
            if (this.#isIframeReady) {
                // 如果监听器已经设置，则停止重试
                this.#log('IframeReady');
                this.#timer && clearTimeout(this.#timer)
            } else {
                // 如果监听器尚未设置，继续重试
                this.#retryPostMessage(message, retries - 1);
            }
        }, this.#retryInterval);
    }

    /**
     * 私有方法，处理收到的消息
     * @param {any} message - 收到的消息
     */
    #handleMessage(message) {
        if (typeof message === 'object' && message !== null && !Array.isArray(message)) {
            let { event, payload } = message
            if (event == 'init_success') {
                this.#state = 1
                // 如果有传初始化数据就发送初始化数据
                if (this.#initData) {
                    this.#sendMessage({
                        event: 'init_data',
                        payload: this.#initData
                    })
                }
            } else if (event == 'listener_added') {
                this.#isListenerAdded = true
                while (this.#messageQueue.length > 0) {
                    const message = this.#messageQueue.shift();
                    this.#sendMessage(message)
                }
            } else if (event == 'execution_result') {
                // 如果提供了回调函数，调用回调函数
                if (this.#onMessageCallback) {
                    this.#onMessageCallback(payload);
                }
            }
        }
    }

}