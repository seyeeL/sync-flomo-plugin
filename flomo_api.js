/*
 * @creater: seyeeL 406668746@qq.com
 * @since: 2023-03-07 21:56:46
 * @LastAuthor: seyeeL 406668746@qq.com
 * @lastTime: 2023-03-07 21:57:40
 * @文件相对于项目的路径: /sync-flomo-plugin/flomo_api.js
 * @message: 
 */
import axios from 'axios'
const baseURL = 'https://flomoapp.com'
const headers = {
  cookie:
    '',
  'x-xsrf-token':
    '',
}

// flomo 信息
const userId = ''
const offset = 50

const http = axios.create({
  baseURL, // api的base_url  process.env.BASE_API,,注意局域网访问时，不能使用localhost
  timeout: 20 * 1000, // 请求超时时间
  headers: headers,
})

http.interceptors.response.use(
  response => {
    const res = response.data
    // console.log('res' ,res) // for debug
    return res
  },
  error => {
    console.log('err' + error) // for debug
    alert('error')
    return Promise.reject(error)
  },
)
export const loadStatFromFlomo = () => {
  return http.get(`/api/user/${userId}/stat/?tz=8:0`)
}
export const fetchMemosByOffset = () => {
  return http.get(`/api/memo/?offset=${offset}&tz=8:0`)
}

export const fetchAllTags = () => {
  return http.get(`/api/tag`)
}

export const fetchMemosByTag = tagName => {
  let tag = encodeURI(tagName)
  return http.get(`/api/memo/?tag=${tag}&tz=8:0`)
}

export const getBacklinkedMemos = slug => {
  return http.get(`/api/memo/${slug}?tz=8:0`)
}
// 按日期请求memo
export const fetchMemosByDate = (start_date, end_date) => {
  return http.get(`/api/memo/?start_date=${start_date}&end_date=${end_date}&tz=8:0`)
}
