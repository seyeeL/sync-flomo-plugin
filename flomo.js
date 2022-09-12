const axios = require('axios')
const cheerio = require('cheerio')
const fs = require('fs')
const dayjs = require('dayjs')
const isBetween = require('dayjs/plugin/isBetween')
dayjs.extend(isBetween) //  use
const userId = '你的userId'
const offset = 50
const baseURL = 'https://flomoapp.com'
const headers = {
  cookie: '你的cookie',
  'x-xsrf-token': '你的x-xsrf-token'
}
const http = axios.create({
  baseURL, // api的base_url  process.env.BASE_API,,注意局域网访问时，不能使用localhost
  timeout: 20 * 1000, // 请求超时时间
  headers: headers
})

http.interceptors.response.use(
  (response) => {
    const res = response.data
    // console.log('res' ,res) // for debug
    return res
  },
  (error) => {
    console.log('err' + error) // for debug
    alert('error')
    return Promise.reject(error)
  }
)
const loadStatFromFlomo = () => {
  return http.get(`/api/user/${userId}/stat/?tz=8:0`)
}
const fetchMemosByOffset = () => {
  return http.get(`/api/memo/?offset=${offset}&tz=8:0`)
}

const fetchAllTags = () => {
  return http.get(`/api/tag`)
}

const fetchMemosByTag = () => {
  return http.get(`/api/memo/?tag=${tagName}&tz=8:0`)
}

const getBacklinkedMemos = (slug) => {
  return http.get(`/api/memo/${slug}?tz=8:0`)
}
// 按日期请求memo
const fetchMemosByDate = (start_date, end_date) => {
  return http.get(`/api/memo/?start_date=${start_date}&end_date=${end_date}&tz=8:0`)
}
const main = async () => {
  // 创建一个叫 flomo 的文件夹，会按日期生成文件同步在这个文件里
  fs.mkdir('flomo', function (error) {
    if (error) {
      console.log(error)
      return false
    }
    console.log('创建目录成功')
  })
  const start_date = '2021-02-28' // 想要同步的开始日期
  const end_date = '2022-09-05' // 结束日期
  const groupDate = dealDate(start_date, end_date)
  // console.log(`groupDate`, groupDate)
  for (let i = 0; i < groupDate.length; i++) {
    let date = groupDate[i]
    let { memos } = await fetchMemosByDate(date, date).catch((error) => {
      console.log('err' + error) // for debug
    })
    // console.log(`${date} 的 memos`, memos)
    if (memos.length > 0) {
      // console.log('memos', memos)
      let content = ''
      memos.forEach((item) => {
        // let obj = { ...item }
        content += `${item.created_at}\n${item.content}\n\n`
      })
      content = handleContent(content)
      write(date, content)
    }
  }
}
const write = (fileName, content) => {
  let path = './flomo/' + fileName + '.md'
  fs.writeFile(path, content, function (error) {
    if (error) {
      console.log(error)
      return false
    }
    console.log(fileName + '写入成功')
  })
}
// 根据开始结束日期处理成日期数组
const dealDate = (start_date, end_date) => {
  let groupDate = []
  let n_start_date = dayjs(start_date).subtract(1, 'day')
  let n_end_date = dayjs(end_date).add(1, 'day')
  for (
    let start = dayjs(start_date, 'YYYY-MM-DD');
    dayjs(start).isBetween(n_start_date, n_end_date);
    start = start.add(1, 'day')
  ) {
    groupDate.push(dayjs(start).format('YYYY-MM-DD'))
  }
  return groupDate
}
// 处理 memo 内容 ，将 html 标签转成 md 语法
const handleContent = (content) => {
  if (content.indexOf('<p>') !== -1) {
    content = content.replace(/<p>/g, '').replace(/<\/p>/g, '\n')
  }
  if (content.indexOf('<strong>') !== -1) {
    content = content.replace(/<strong>/g, '*').replace(/<\/strong>/g, '*')
  }
  let $ = cheerio.load(content)
  if (content.indexOf('<ol>') !== -1) {
    $('ol').each(function (i, el) {
      $(this)
        .children()
        .each(function (j, ele) {
          let str = `${j + 1}. ${$(this).text()}\n`
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
          let str = `* ${$(this).text()}\n`
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
main()
