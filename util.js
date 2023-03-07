import fs from 'fs'
import dayjs from 'dayjs'
/**
 * @description: 在flomo的日记里引入flomo文件
 * @return {*}
 */
export const handleJournal = () => {
  // flomo文件夹路径
  const path = 'E:/MyObsidian/flomo/'
  // 日记文件夹路径
  const path2 = 'E:/MyObsidian/journals/'

  fs.readdir(path, (err, files) => {
    // files是名称数组
    files.forEach((filename, index) => {
      // 将数据附加到文件
      let new_path = path2 + filename
      const data = `\n![[flomo/${filename}]]`
      let testHtml = fs.readFileSync(new_path, { encoding: 'utf-8', flag: 'a+' })

      if (fs.lstatSync(new_path).isDirectory()) {
        return
      }
      // console.log('testHtml', testHtml);
      if (testHtml.indexOf('![[flomo/') === -1) {
        fs.appendFileSync(new_path, data, 'utf8')
      }
      if (index === files.length - 1) {
        console.log('处理完成')
      }
    })
  })
}

/**
 * @description: 根据开始结束日期处理成日期数组
 * @param {*} start_date
 * @param {*} end_date
 * @return {*}
 */
export const dealDate = (start_date, end_date) => {
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
