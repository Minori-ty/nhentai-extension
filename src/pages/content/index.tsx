import { SinglePage } from '../nhentai/SinglePage'
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
            // 后续实现滚动加载功能
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
