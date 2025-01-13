// 保存原始的console方法
const originalConsole = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
}

// 防止console被清除
Object.defineProperties(console, {
    log: {
        get: () => originalConsole.log,
        set: () => {},
        configurable: false,
    },
    error: {
        get: () => originalConsole.error,
        set: () => {},
        configurable: false,
    },
    warn: {
        get: () => originalConsole.warn,
        set: () => {},
        configurable: false,
    },
    info: {
        get: () => originalConsole.info,
        set: () => {},
        configurable: false,
    },
    debug: {
        get: () => originalConsole.debug,
        set: () => {},
        configurable: false,
    },
})

import { SinglePage } from '../nhentai/SinglePage'
import { InfiniteScroll } from '../nhentai/InfiniteScroll'
import './style.css'

/**
 * 页面类型枚举
 */
enum PageType {
    /** 画廊页面 */
    Gallery = 'gallery',
    /** 单图模式 */
    Single = 'single',
    /** 列表页面 */
    List = 'list',
}

/**
 * 获取当前页面类型
 * @returns 页面类型
 */
function getPageType(): PageType {
    const url = window.location.href
    if (url.match(/\/g\/\d+\/\d+\/\?single=true/)) {
        return PageType.Single
    }
    if (url.match(/\/g\/\d+\/?$/)) {
        return PageType.Gallery
    }
    return PageType.List
}

/**
 * 初始化页面
 */
function initPage(): void {
    const pageType = getPageType()

    switch (pageType) {
        case PageType.Gallery:
        case PageType.Single:
            SinglePage.init()
            break
        case PageType.List:
            InfiniteScroll.init()
            break
    }
}

try {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage)
    } else {
        initPage()
    }
    console.log('content script loaded')
} catch (e) {
    console.error(e)
}
