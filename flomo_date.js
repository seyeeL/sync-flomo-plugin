import { fetchMemosByTag, fetchMemosByDate } from './flomo_api.js'
import { handleJournal, dealDate } from './util.js'

import cheerio from 'cheerio'
// 文档 https://github.com/cheeriojs/cheerio/wiki/Chinese-README#-selector-context-root-
import fs from 'fs'
import axios from 'axios'
import dayjs from 'dayjs'
// 文档  https://day.js.org/docs/zh-CN/manipulate/subtract
// const isBetween = require('dayjs/plugin/isBetween')
import isBetween from 'dayjs/plugin/isBetween.js'
dayjs.extend(isBetween) //  use
import readline from 'readline'

// const readLastLines = require('read-last-lines')
import readLastLines from 'read-last-lines'

const start_date = '2021-02-28' // 想要同步的开始日期
// const start_date = '2022-09-01' // 想要同步的开始日期
// const start_date = dayjs().subtract(1, 'month').format('YYYY-MM-DD') // 一个月内
// const end_date = dayjs().format('YYYY-MM-DD') // 结束日期选当天
const end_date = dayjs().subtract(1, 'day').format('YYYY-MM-DD') // 结束日期选昨天
// const end_date = '2022-09-05' // 结束日期

const write = (fileName, content, notePath) => {
  // let path = './flomo/flomo/' + fileName + '.md'
  let path = notePath || 'E:/MyObsidian/flomo/' + fileName + '.md'
  fs.writeFile(path, content, function (error) {
    if (error) {
      console.log(error)
      return false
    }
    console.log(fileName + ' 写入成功')
    if (fileName === end_date) {
      console.log('同步完成')
    }
  })
}

// 处理 memo 内容 ，将 html 标签转成 md 语法
const handleContent = (content, type) => {
  // 有的 li 里面也嵌套了 p
  if (content.indexOf('<li><p>') !== -1) {
    content = content.replace(/<li><p>/g, '<li>').replace(/<\/p><\/li>/g, '</li>')
  }
  if (content.indexOf('<p>') !== -1) {
    content = content.replace(/<p>/g, '').replace(/<\/p>/g, '\n')
  }
  if (content.indexOf('<strong>') !== -1) {
    content = content.replace(/<strong>/g, '**').replace(/<\/strong>/g, '** ') // 加粗标签
  }
  // 不想创建这些标签，不想处理的可以注释掉
  content = content.replace(/#book\//g, '— ') // 去掉书籍标签前缀
  content = content.replace(/#from\//g, '— ')
  content = content.replace(/#App\//g, '')

  let $ = cheerio.load(content)
  if (content.indexOf('<ol>') !== -1) {
    $('ol').each(function (i, el) {
      $(this)
        .children()
        .each(function (j, ele) {
          let str =
            type === 'keyword'
              ? `${j + 1}. [[${$(this).text()}]]\n`
              : `${j + 1}. ${$(this).text()}\n`
          // console.log('str', str)
          $(this).html(str)
        })
    })
  }
  if (content.indexOf('<ul>') !== -1) {
    $('ul').each(function (i, el) {
      $(this)
        .children()
        .each(function (j, ele) {
          let str = `- ${$(this).text()}\n`
          // console.log('str', str)
          $(this).html(str)
        })
    })
  }
  content = $.text()
  // console.log('content', content)
  content = content.replace(/\n$/, '')
  return content
}

// 按标签处理
const fetchByTag = async tag => {
  let { memos } = await fetchMemosByTag(tag)
  if (memos.length > 0) {
    // console.log('memos', memos)

    memos.forEach(item => {
      if (item.tags.includes('置顶')) {
        return
      }
      let content = ''
      let title = ''
      content += `${item.content}`
      // content += `${item.created_at}\n${item.content}\n\n`
      content = content.replace(/#卡片/g, '') // 去掉标签
      let $ = cheerio.load(content)
      if (content.indexOf('<p>') !== -1) {
        title = $('p').eq(0).text()
      }
      content = handleContent(content)
      if (title) {
        content = content.replace(title, '') // 第一行
        content = `---\nsource: flomo\n---\n` + content // 加上yaml
        let path = 'E:/MyObsidian/我的笔记/' + title + '.md'
        write(title, content, path)
      }
    })
  }
}

// 关键词标签的处理
const fetchByKeyword = async keyword => {
  let { memos } = await fetchMemosByTag(keyword)
  if (memos.length > 0) {
    // console.log('memos', memos)
    let title = '关键词列表'
    let keywordArr = new Map()
    // 处理已有清单的文件 start===========================
    let path = 'E:/MyObsidian/我的笔记/' + title + '.md'
    let lastLine = await readLastLines.read(path, 1)
    // console.log('lastLine', lastLine)
    const rl = readline.createInterface({
      input: fs.createReadStream(path, 'utf8'),
      crlfDelay: Infinity,
    })
    let catalogue = ''
    let arr = []

    for await (const line of rl) {
      // Each line in input.txt will be successively available here as `line`.

      // console.log(`Line from file: ${line}`)

      if (line.indexOf('####') !== -1) {
        if (catalogue) {
          keywordArr.set(catalogue, [...arr])
          // console.log(`keywordArr: ${arr}`)
        }
        arr = []
        catalogue = line.replace('####', '').trim()
        // console.log(`Line from file: ${catalogue}`)
      } else {
        arr.push(line.replace(/\d+./, '').replace('[[', '').replace(']]', '').trim())
        if (lastLine.indexOf(line) !== -1) {
          keywordArr.set(catalogue, [...arr])
        }
      }
      // console.log(`arr: ${arr}`)
    }
    console.log('end===========================')
    for (let entry of keywordArr) {
      // console.log('entry', entry)
      if (!entry[0]) {
        keywordArr.delete(entry[0])
      }
    }
    // 处理已有清单的文件 end===========================
    memos.forEach(item => {
      if (item.tags.includes('常用')) {
        return
      }
      // let content = handleContent(item.content, 'keyword')
      let tagArr = item.tags[0].split('/')
      let contentArr = []
      let tagName = tagArr[tagArr.length - 1]
      content = item.content.replace(/^#关键词\S+/, '') // 去掉标签
      // 有的 li 里面也嵌套了 p
      if (content.indexOf('<li><p>') !== -1) {
        content = content.replace(/<li><p>/g, '<li>').replace(/<\/p><\/li>/g, '</li>')
      }
      let $ = cheerio.load(content)
      if (content.indexOf('<ol>') !== -1) {
        $('ol').each(function (i, el) {
          $(this)
            .children()
            .each(function (j, ele) {
              contentArr.push($(this).text())
            })
        })
      }
      if (content.indexOf('<ul>') !== -1) {
        $('ul').each(function (i, el) {
          $(this)
            .children()
            .each(function (j, ele) {
              contentArr.push($(this).text())
            })
        })
      }
      keywordArr.set(tagName, contentArr)
    })
    let keyContent = ''
    for (let entry of keywordArr) {
      // console.log('entry', entry)
      keyContent += '#### ' + entry[0] + '\n\n'
      let newArr = Array.from(new Set(entry[1])).filter(Boolean)
      newArr.forEach((item, index) => {
        keyContent += `${index + 1}. [[${item}]]\n`
        if (index === newArr.length - 1) {
          keyContent += '\n'
        }
      })
    }
    write(title, keyContent, path)
  }
}

const main = async () => {
  // 按日期格式处理
  const groupDate = dealDate(start_date, end_date)
  // console.log(`groupDate`, groupDate)
  for (let i = 0; i < groupDate.length; i++) {
    let date = groupDate[i]
    let { memos } = await fetchMemosByDate(date, date).catch(error => {
      console.log('err' + error) // for debug
    })
    // console.log(`${date} 的 memos`, memos)
    if (memos.length > 0) {
      // console.log('memos', memos)
      let content = ''
      memos.forEach(item => {
        // let obj = { ...item }
        if (item.tags.includes('卡片') || item.tags.includes('关键词')) {
          return
        }
        if (!item.tags.includes('lookbook')) {
          content += `${item.created_at}\n${item.content || ''}\n`
        }
        // 图片处理
        if (item.files.length > 0) {
          item.files.forEach(async (file, index) => {
            //使用在线预览
            // content += `![](${file.url})\n\n`
            // 本地图片
            const fileName = `flomo ${item.created_at.replace(/:/g, '')}${index || ''}.jpg`
            if (!item.tags.includes('lookbook')) {
              content += `![[${fileName}]]\n\n`
            }
            let url = file.url
            const res = await axios.get(url, {
              responseType: 'arraybuffer', // 特别注意，需要加上此参数
            })
            const path = `E:/MyObsidian/assets/`

            fs.writeFileSync(path + fileName, res.data, { flag: 'w+' })
          })
        }

        content += '\n'
      })

      content = handleContent(content)

      if (content) {
        write(date, content)
      }
    }
  }
  // 按标签处理
  await fetchByTag('卡片')
  // await fetchByKeyword('关键词')
  handleJournal()
}

main()
// handleJournal()
