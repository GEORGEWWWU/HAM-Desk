<template>
  <div class="logapp">
    <!--添加QSO-->
    <div class="addQSO">
      <div class="addQSOcontainer">
        <div class="addQSO_input">
          <div class="addbtn" :class="{ addActive: isInputFocused }">
            <input type="text" placeholder="输入呼号" ref="callsignInput" v-model="callsignValue"
              @focus="isInputFocused = true" @blur="isInputFocused = false" @input="handleCallsignInput"
              @keyup.enter="addQSO" maxlength="6">
            <button @click="addQSO">
              <p>添加 QSO</p>
            </button>
          </div>
        </div>
        <div class="QSO_info">
          <p>QSO数量：<span>{{ logs.length }}</span></p>
          <span>|</span>
          <p>默认日志本</p>
          <span>|</span>
          <p class="exportCSV" @click="handleExportData">导出CSV</p>
        </div>
      </div>
    </div>
    <!--QSO列表容器-->
    <div class="QSO_Contianer">
      <!--QSO列表-->
      <div class="qsoList">
        <!--表格-->
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" v-model="selectedAll"></th>
              <th>日期时间</th>
              <th>呼号 <span class="rxtext">RX</span></th>
              <th>频率 <span class="txtext">TX</span></th>
              <th>模式 <span class="rxtext">RX</span></th>
              <th>信号 <span class="txtext">TX</span></th>
              <th>信号 <span class="rxtext">RX</span></th>
              <th>发射功率</th>
              <th>对方位置</th>
              <th>QSL状态 <span class="txtext">TX</span><span class="rxtext">RX</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="i in pageSize" :key="i">
              <tr v-if="currentPageData[i - 1]">
                <td><input type="checkbox" :value="currentPageData[i - 1].id" v-model="selectedItems"></td>
                <td>{{ currentPageData[i - 1].datetime }}</td>
                <td>{{ currentPageData[i - 1].call }}</td>
                <td>{{ currentPageData[i - 1].freq }}</td>
                <td>{{ currentPageData[i - 1].mode }}</td>
                <td>{{ currentPageData[i - 1].rstS }}</td>
                <td>{{ currentPageData[i - 1].rstR }}</td>
                <td>{{ currentPageData[i - 1].power }}</td>
                <td style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{
                  currentPageData[i - 1].qth }}</td>
                <td>{{ currentPageData[i - 1].qsl }}</td>
              </tr>
              <tr v-else>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <!--操作和提示-->
      <div class="logOption">
        <div class="logop_left">
          <p>共 {{ logs.length }} 条记录，最后一次通联时间：{{ logs[0]?.datetime || '暂无' }}</p>
        </div>
        <div class="logop_right">
          <button class="pagebtn" @click="prevPage" :disabled="currentPage === 1">
            <img :src="getIconPath('leftar')">
          </button>
          <p class="pageIndex">{{ currentPage }} / {{ totalPages }}</p>
          <button class="pagebtn" @click="nextPage" :disabled="currentPage === totalPages">
            <img :src="getIconPath('rightar')">
          </button>
          <button class="optbtn" @click="editSelected" :disabled="selectedItems.length !== 1">编辑记录</button>
          <button class="optbtn" @click="deleteSelected" :disabled="selectedItems.length === 0 || isEditing">删除选中 ({{
            selectedItems.length }})</button>
        </div>
      </div>
    </div>

    <!--编辑QSO弹窗-->
    <div class="editQSO" v-show="showEditQSO">
      <div class="edit_container">
        <!--编辑表单-->
        <div class="editform">
          <!--QSO呼号容器-->
          <div class="edit_item">
            <div class="edit_title">
              <p>{{ isEditing ? '编辑 QSO 与' : 'QSO 与' }}</p>
            </div>
            <div class="edit_callinfo">
              <p>{{ editCallsignValue }}</p>
            </div>
          </div>
          <!--QSO日期时间容器-->
          <div class="edit_item">
            <div class="edit_title">
              <p>QSO 开始于</p>
            </div>
            <div class="edit_datetime">
              <div class="datetime_input">
                <p>日期：</p>
                <input type="date" ref="dateInput">
                <p>时间：</p>
                <input type="time" ref="timeInput">
                <button @click="setCurrentDateTime">
                  <h2>现在</h2>
                </button>
              </div>
            </div>
          </div>
          <!--QSO频率模式容器-->
          <div class="edit_item">
            <div class="edit_title">
              <p></p>
            </div>
            <div class="edit_freqmode">
              <div class="freq_input">
                <p>频率</p>
                <input type="text" placeholder="420.000" v-model="frequencyValue" @input="handleFrequencyInput"
                  @focus="focusFrequencyInput" @blur="blurFrequencyInput">
                <p>MHz</p>
              </div>
              <div class="mode_input">
                <p>模式</p>
                <select v-model="selectedMode">
                  <option value="FM" selected>FM</option>
                  <option value="AM">AM</option>
                  <option value="CW">CW</option>
                  <option value="USB">USB</option>
                  <option value="LSB">LSB</option>
                  <option value="RTTY">RTTY</option>
                  <option value="PSK31">PSK31</option>
                  <option value="SSTV">SSTV</option>
                </select>
                <button @click="selectMode('FM')" :class="{ active: selectedMode === 'FM' }">
                  <h2>FM</h2>
                </button>
                <button @click="selectMode('USB')" :class="{ active: selectedMode === 'USB' }">
                  <h2>USB</h2>
                </button>
                <button @click="selectMode('LSB')" :class="{ active: selectedMode === 'LSB' }">
                  <h2>LSB</h2>
                </button>
                <button class="lastbtn" @click="selectMode('CW')" :class="{ active: selectedMode === 'CW' }">
                  <h2>CW</h2>
                </button>
              </div>
            </div>
          </div>
          <!--RST信号报告和功率容器-->
          <div class="edit_item">
            <div class="edit_title">
              <p>RST</p>
            </div>
            <div class="edit_rstpower">
              <div class="txrst_input">
                <p>发射信号</p>
                <input type="text" v-model="txSignalValue" @input="handleTxSignalInput" @blur="blurTxSignalInput">
                <button @click="selectTxSignal('59')">
                  <h2>59</h2>
                </button>
                <button class="lastbtn" @click="selectTxSignal('599')">
                  <h2>599</h2>
                </button>
              </div>
              <div class="rxrst_input">
                <p>接收信号</p>
                <input type="text" v-model="rxSignalValue" @input="handleRxSignalInput" @blur="blurRxSignalInput">
                <button @click="selectRxSignal('59')">
                  <h2>59</h2>
                </button>
                <button class="lastbtn" @click="selectRxSignal('599')">
                  <h2>599</h2>
                </button>
              </div>
              <div class="power_input">
                <p>功率</p>
                <input type="text" v-model="powerValue" @input="handlePowerInput" @blur="blurPowerInput">
                <p>W</p>
              </div>
            </div>
          </div>
          <!--通联内容-->
          <div class="edit_item" v-show="showContent">
            <div class="edit_title">
              <p>通联内容</p>
            </div>
            <div class="edit_content">
              <textarea name="radio_content"></textarea>
            </div>
          </div>
          <!--QSL卡片-->
          <div class="edit_item" v-show="showQSL">
            <div class="edit_title">
              <p>QSL卡片</p>
            </div>
            <div class="edit_qslcard">
              <div class="qslcard_btn">
                <p>发送状态</p>
                <select name="qsl_sent_status" :value="qslSentStatus" @change="handleQslSentStatusChange">
                  <option value="未发送">未发送</option>
                  <option value="已发送">已发送</option>
                </select>
                <input type="date" name="qsl_sent_date" :value="qslSentDate" @change="handleQslSentDateChange">
              </div>
              <div class="qslcard_btn">
                <p>接收状态</p>
                <select name="qsl_received_status" :value="qslReceivedStatus" @change="handleQslReceivedStatusChange">
                  <option value="未接收">未接收</option>
                  <option value="已接收">已接收</option>
                </select>
                <input type="date" name="qsl_received_date" :value="qslReceivedDate"
                  @change="handleQslReceivedDateChange">
              </div>
            </div>
          </div>
          <!--QTH位置-->
          <div class="edit_item">
            <div class="edit_title">
              <p>QTH</p>
            </div>
            <div class="edit_qth">
              <input type="text" placeholder="输入对方位置" v-model="qthValue">
            </div>
          </div>
          <!--更多细节添加按钮-->
          <div class="edit_item">
            <div class="edit_title">
              <p>更多细节</p>
            </div>
            <div class="edit_more">
              <div class="more_btn">
                <button @click="toggleContent">
                  <h2>{{ showContent ? '- 通联内容' : '+ 通联内容' }}</h2>
                </button>
                <button @click="toggleQSL">
                  <h2>{{ showQSL ? '- QSL卡片' : '+ QSL卡片' }}</h2>
                </button>
              </div>
            </div>
          </div>
        </div>
        <!--提交按钮-->
        <div class="edit_submit">
          <button class="savebtn" @click="saveQSO">
            <img :src="getIconPath('保存')">
            <h2>{{ isEditing ? '更新记录' : '保存记录' }}</h2>
          </button>
          <button @click="cancelEditQSO">
            <h2>取消</h2>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useTheme } from '../function/useTheme'
import { useLog } from '../function/useLog'
const theme = useTheme()
const { logs, save, deleteLogEntry, exportToCsv } = useLog()

// 输入框聚焦状态
const isInputFocused = ref(false)
// 输入框引用
const callsignInput = ref<HTMLInputElement>()
// 呼号输入值
const callsignValue = ref('')
// 控制编辑QSO弹窗显示/隐藏的状态
const showEditQSO = ref(false)
// 编辑QSO弹窗中的呼号值
const editCallsignValue = ref('')
// 日期和时间输入框引用
const dateInput = ref<HTMLInputElement>()
const timeInput = ref<HTMLInputElement>()
// 模式选择
const selectedMode = ref('FM')
// 频率输入值
const frequencyValue = ref('420.000')
// 信号强度输入值
const txSignalValue = ref('59') // 发射信号
const rxSignalValue = ref('59') // 接收信号
// 功率输入值
const powerValue = ref('5')
// 通联内容和QSL卡片显示状态
const showContent = ref(false)
const showQSL = ref(false)
// QSL卡片发送和接收状态
const qslSentStatus = ref('未发送')
const qslReceivedStatus = ref('未接收')
// QSL卡片发送和接收日期
const qslSentDate = ref('')
const qslReceivedDate = ref('')
// QTH位置
const qthValue = ref('')

// 全选功能相关变量
const selectedItems = ref<string[]>([])
const selectedAll = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)

// 全选/取消全选
watch(selectedAll, (newValue) => {
  if (newValue) {
    // 全选当前页的所有项目
    selectedItems.value = currentPageData.value.map(item => item.id)
  } else {
    // 取消全选
    selectedItems.value = []
  }
})

// 监听单个选择变化，更新全选状态
watch(selectedItems, (newItems) => {
  const currentPageIds = currentPageData.value.map(item => item.id)
  const allCurrentPageSelected = currentPageIds.every(id => newItems.includes(id))

  // 如果当前页全部选中，则全选框也选中
  selectedAll.value = allCurrentPageSelected
}, { deep: true })

// 删除选中的日志
const deleteSelected = () => {
  if (selectedItems.value.length === 0) return

  if (confirm(`确定要删除选中的 ${selectedItems.value.length} 条日志记录吗？`)) {
    // 使用Promise.all来等待所有删除操作完成
    Promise.all(selectedItems.value.map(id => deleteLogEntry(id)))
      .then(() => {
        // 清空选中项
        selectedItems.value = []
        selectedAll.value = false
      })
      .catch(error => {
        console.error('删除日志失败:', error)
        alert('删除日志失败，请重试')
      })
  }
}

// 编辑选中的日志
const editSelected = () => {
  if (selectedItems.value.length !== 1) return

  // 获取选中的日志ID
  const selectedId = selectedItems.value[0]

  // 查找对应的日志条目
  const logEntry = logs.value.find(log => log.id === selectedId)

  if (logEntry) {
    // 设置编辑状态和ID
    isEditing.value = true
    editingId.value = selectedId

    // 填充表单数据
    editCallsignValue.value = logEntry.call
    frequencyValue.value = logEntry.freq
    selectedMode.value = logEntry.mode
    txSignalValue.value = logEntry.rstS
    rxSignalValue.value = logEntry.rstR
    powerValue.value = logEntry.power
    qthValue.value = logEntry.qth

    // 设置日期时间
    const datetime = new Date(logEntry.datetime)
    if (dateInput.value) {
      dateInput.value.value = datetime.toISOString().split('T')[0]
    }
    if (timeInput.value) {
      timeInput.value.value = datetime.toTimeString().slice(0, 5)
    }

    // 加载通联内容（如果存在）
    if (logEntry.message) {
      showContent.value = true
      // 使用nextTick确保DOM更新后再设置textarea的值
      nextTick(() => {
        const textarea = document.querySelector('textarea[name="radio_content"]') as HTMLTextAreaElement
        if (textarea) {
          textarea.value = logEntry.message
        }
      })
    } else {
      showContent.value = false
    }

    // 加载QSL卡片信息（如果存在）
    if (logEntry.qsl) {
      showQSL.value = true
      // 解析QSL状态，格式为"发送状态/接收状态"
      const qslParts = logEntry.qsl.split('/')
      if (qslParts.length >= 2) {
        qslSentStatus.value = qslParts[0] || '未发送'
        qslReceivedStatus.value = qslParts[1] || '未接收'
      }

      // 加载QSL发送日期（如果存在）
      if (logEntry.qslSentDate) {
        qslSentDate.value = logEntry.qslSentDate
      }

      // 加载QSL接收日期（如果存在）
      if (logEntry.qslReceivedDate) {
        qslReceivedDate.value = logEntry.qslReceivedDate
      }
    } else {
      showQSL.value = false
      qslSentStatus.value = '未发送'
      qslReceivedStatus.value = '未接收'
      qslSentDate.value = ''
      qslReceivedDate.value = ''
    }

    // 打开编辑弹窗
    showEditQSO.value = true
  }
}

// 处理呼号输入，只允许字母和数字，并转换为大写
const handleCallsignInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  // 只保留字母和数字，并转换为大写
  callsignValue.value = target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

// 添加QSO
const addQSO = () => {
  if (!callsignValue.value.trim()) {
    // 如果呼号为空，不执行任何操作
    return
  }

  // 显示编辑QSO弹窗并传递呼号值
  showEditQSO.value = true
  editCallsignValue.value = callsignValue.value

  // 清空输入框
  callsignValue.value = ''

  // 重新聚焦到输入框
  if (callsignInput.value) {
    callsignInput.value.focus()
  }
}

// 设置当前日期和时间
const setCurrentDateTime = () => {
  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const time = now.toTimeString().slice(0, 5)

  // 设置日期和时间输入框的值
  if (dateInput.value) {
    dateInput.value.value = date
  }
  if (timeInput.value) {
    timeInput.value.value = time
  }
}

// 选择模式
const selectMode = (mode: string) => {
  selectedMode.value = mode
}

// 处理频率输入
const handleFrequencyInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value

  // 只允许数字和一个小数点
  value = value.replace(/[^0-9.]/g, '')

  // 确保只有一个小数点
  const parts = value.split('.')
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('')
  }

  // 限制整数部分最多6位
  if (parts[0].length > 6) {
    parts[0] = parts[0].substring(0, 6)
    value = parts.join('.')
  }

  // 限制小数部分最多3位
  if (parts.length === 2 && parts[1].length > 3) {
    parts[1] = parts[1].substring(0, 3)
    value = parts.join('.')
  }

  frequencyValue.value = value
}

// 频率输入框获得焦点时清空内容
const focusFrequencyInput = () => {
  if (frequencyValue.value === '420.000') {
    frequencyValue.value = ''
  }
}

// 频率输入框失去焦点时格式化
const blurFrequencyInput = () => {
  // 如果输入为空或0，则保留默认值420.000
  if (!frequencyValue.value || frequencyValue.value === '0' || frequencyValue.value === '') {
    frequencyValue.value = '420.000'
    return
  }

  // 如果没有小数点，添加.000
  if (!frequencyValue.value.includes('.')) {
    frequencyValue.value = frequencyValue.value + '.000'
  } else {
    // 如果有小数点，确保小数部分有3位
    const parts = frequencyValue.value.split('.')
    if (parts[1].length === 1) {
      frequencyValue.value = frequencyValue.value + '00'
    } else if (parts[1].length === 2) {
      frequencyValue.value = frequencyValue.value + '0'
    }
  }
}

// 选择信号强度
const selectTxSignal = (signal: string) => {
  txSignalValue.value = signal
}
const selectRxSignal = (signal: string) => {
  rxSignalValue.value = signal
}

// 处理信号强度输入
const handleTxSignalInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value

  // 只允许数字
  value = value.replace(/[^0-9]/g, '')

  // 限制最多3位
  if (value.length > 3) {
    value = value.substring(0, 3)
  }

  txSignalValue.value = value
}
const handleRxSignalInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value

  // 只允许数字
  value = value.replace(/[^0-9]/g, '')

  // 限制最多3位
  if (value.length > 3) {
    value = value.substring(0, 3)
  }

  rxSignalValue.value = value
}
// 处理信号强度输入框失去焦点
const blurTxSignalInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value

  // 如果输入为空，不做处理
  if (!value) {
    txSignalValue.value = ''
    return
  }

  // 自动去除前导零，但保留单个0
  if (value.length > 1) {
    value = value.replace(/^0+/, '')
    // 如果去除后为空，则设为0
    if (!value) {
      value = '0'
    }
  }

  // 如果值为0，则清空
  if (value === '0') {
    txSignalValue.value = ''
  } else {
    txSignalValue.value = value
  }
}
const blurRxSignalInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value

  // 如果输入为空，不做处理
  if (!value) {
    rxSignalValue.value = ''
    return
  }

  // 自动去除前导零，但保留单个0
  if (value.length > 1) {
    value = value.replace(/^0+/, '')
    // 如果去除后为空，则设为0
    if (!value) {
      value = '0'
    }
  }

  // 如果值为0，则清空
  if (value === '0') {
    rxSignalValue.value = ''
  } else {
    rxSignalValue.value = value
  }
}

// 处理功率输入
const handlePowerInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value

  // 只允许数字和一个小数点
  value = value.replace(/[^0-9.]/g, '')

  // 防止多个小数点
  const dotIndex = value.indexOf('.')
  if (dotIndex !== -1) {
    value = value.substring(0, dotIndex + 1) + value.substring(dotIndex + 1).replace(/\./g, '')
  }

  powerValue.value = value
}

// 处理功率输入框失去焦点
const blurPowerInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value

  // 如果输入为空，设置为默认值5
  if (!value) {
    powerValue.value = '5'
    return
  }

  // 分割整数和小数部分
  const parts = value.split('.')
  let integerPart = parts[0] || '0'
  let decimalPart = parts[1] || ''

  // 限制整数部分最多4位
  if (integerPart.length > 4) {
    integerPart = integerPart.substring(0, 4)
  }

  // 限制小数部分最多3位
  if (decimalPart.length > 3) {
    decimalPart = decimalPart.substring(0, 3)
  }

  // 处理逻辑：
  // 1. 如果整数部分为0，且有小数部分且小数部分不全为0，则保留小数部分
  // 2. 其他情况（整数部分不为0，或者整数部分为0但小数部分全为0或无小数部分），只保留整数部分

  if (integerPart === '0' && decimalPart && !decimalPart.match(/^0+$/)) {
    // 整数部分为0，且小数部分不全为0，保留小数部分
    // 确保小数部分有3位
    while (decimalPart.length < 3) {
      decimalPart += '0'
    }
    value = '0.' + decimalPart
  } else {
    // 其他情况，只保留整数部分
    value = integerPart
  }

  // 检查是否为0值
  if (value === '0') {
    powerValue.value = '5'  // 设置为默认值
  } else {
    powerValue.value = value
  }
}

// 分页相关变量
const currentPage = ref(1)
const pageSize = ref(12) // 默认每页显示12条数据
const viewportWidth = ref(window.innerWidth)

// 根据视口宽度动态调整每页显示的行数
const updatePageSize = () => {
  viewportWidth.value = window.innerWidth
  if (viewportWidth.value > 980) {
    pageSize.value = 14
  } else {
    pageSize.value = 12
  }
}

// 监听窗口大小变化
window.addEventListener('resize', updatePageSize)
// 初始化时设置正确的页面大小
updatePageSize()

// 计算总页数
const totalPages = computed(() => {
  return Math.max(1, Math.ceil(logs.value.length / pageSize.value))
})

// 计算当前页显示的数据
const currentPageData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return logs.value.slice(start, end)
})

// 上一页
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    // 切换页面时重置选择状态
    selectedItems.value = []
    selectedAll.value = false
  }
}

// 下一页
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    // 切换页面时重置选择状态
    selectedItems.value = []
    selectedAll.value = false
  }
}

// 监听logs变化，重置页码
watch(logs, () => {
  currentPage.value = 1
})

// 组件挂载后自动聚焦输入框
onMounted(() => {
  nextTick(() => {
    if (callsignInput.value) {
      callsignInput.value.focus()
      isInputFocused.value = true
    }
  })
})

// 导入所有图标
const icons = {
  leftar: new URL('../assets/leftar.svg', import.meta.url).href,
  leftar_white: new URL('../assets/leftar_white.svg', import.meta.url).href,
  rightar: new URL('../assets/rightar.svg', import.meta.url).href,
  rightar_white: new URL('../assets/rightar_white.svg', import.meta.url).href,
  保存: new URL('../assets/保存_white.svg', import.meta.url).href,
  保存_white: new URL('../assets/保存.svg', import.meta.url).href,
}
// 根据当前主题动态获取图标路径
const getIconPath = (iconName: string) => {
  const iconKey = theme.theme.value === 'dark' ? `${iconName}_white` : iconName
  return (icons as Record<string, string>)[iconKey]
}

// 切换通联内容显示状态
const toggleContent = () => {
  showContent.value = !showContent.value
}

// 切换QSL卡片显示状态
const toggleQSL = () => {
  showQSL.value = !showQSL.value
}

// 处理QSL发送状态变化
const handleQslSentStatusChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  qslSentStatus.value = target.value

  // 如果状态改为未发送，清空日期
  if (target.value === '未发送') {
    qslSentDate.value = ''
  }
}

// 处理QSL发送日期变化
const handleQslSentDateChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  qslSentDate.value = target.value

  // 如果选择了日期，自动将状态改为已发送
  if (target.value) {
    qslSentStatus.value = '已发送'
  }
}

// 处理QSL接收状态变化
const handleQslReceivedStatusChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  qslReceivedStatus.value = target.value

  // 如果状态改为未接收，清空日期
  if (target.value === '未接收') {
    qslReceivedDate.value = ''
  }
}

// 取消编辑QSO弹窗
const cancelEditQSO = () => {
  showEditQSO.value = false
  editCallsignValue.value = ''

  // 如果是编辑模式，重置编辑状态
  if (isEditing.value) {
    isEditing.value = false
    editingId.value = null
  }

  // 重置表单
  resetForm()
}

// 处理QSL接收日期变化
const handleQslReceivedDateChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  qslReceivedDate.value = target.value

  // 如果选择了日期，自动将状态改为已接收
  if (target.value) {
    qslReceivedStatus.value = '已接收'
  }
}

// 导出CSV功能
const handleExportData = async () => {
  try {
    const result = await exportToCsv()
    if (!result.success) {
      console.error('导出失败:', result.error)
      // 可以在这里添加用户提示，例如使用ElMessage
    } else {
      console.log('导出成功:', result.fileName)
      // 可以在这里添加成功提示
    }
  } catch (error) {
    console.error('导出CSV时出错:', error)
    // 可以在这里添加错误提示
  }
}
const saveQSO = () => {
  // 获取日期和时间输入框的值
  const dateValue = dateInput.value?.value || ''
  const timeValue = timeInput.value?.value || ''

  // 验证必填字段
  if (!dateValue || !timeValue || !frequencyValue.value || !selectedMode.value ||
    !txSignalValue.value || !rxSignalValue.value || !powerValue.value || !qthValue.value) {
    alert('请填写所有必填字段：日期时间、频率、模式、信号强度、功率和QTH位置')
    return
  }

  // 获取通联内容（如果显示）
  let contentValue = ''
  if (showContent.value) {
    const textarea = document.querySelector('textarea[name="radio_content"]') as HTMLTextAreaElement
    contentValue = textarea?.value || ''
  }

  // 构建QSO记录对象，确保所有属性都是可序列化的
  const qsoRecord: any = {
    id: isEditing.value ? editingId.value! : (Date.now().toString(36) + Math.random().toString(36).substr(2)), // 编辑时使用原ID，新建时生成新ID
    datetime: `${dateValue} ${timeValue}`,
    call: editCallsignValue.value,
    freq: frequencyValue.value,
    mode: selectedMode.value,
    rstS: txSignalValue.value,
    rstR: rxSignalValue.value,
    power: powerValue.value,
    qth: qthValue.value, // 位置字段，从输入框获取
    message: contentValue, // 通联内容
    qsl: `${qslSentStatus.value}/${qslReceivedStatus.value}`,
  }

  // 如果QSL发送状态为已发送且有日期，添加发送日期
  if (qslSentStatus.value === '已发送' && qslSentDate.value) {
    qsoRecord.qslSentDate = qslSentDate.value
  }

  // 如果QSL接收状态为已接收且有日期，添加接收日期
  if (qslReceivedStatus.value === '已接收' && qslReceivedDate.value) {
    qsoRecord.qslReceivedDate = qslReceivedDate.value
  }

  // 确保对象是可序列化的
  const serializableRecord = JSON.parse(JSON.stringify(qsoRecord))

  if (isEditing.value) {
    // 编辑模式：找到并更新现有记录
    const index = logs.value.findIndex(log => log.id === editingId.value)
    if (index !== -1) {
      // 保留原始位置，只更新内容
      logs.value[index] = serializableRecord

      // 构建包含logs数组的对象
      const logData = {
        logs: logs.value,
        statistics: {
          totalContacts: logs.value.length,
          lastContact: logs.value.length > 0 ? logs.value[0].datetime : ''
        }
      }

      // 确保整个logData对象是可序列化的
      const serializableLogData = JSON.parse(JSON.stringify(logData))

      // 保存数据
      window.electronAPI.logWrite(serializableLogData)
        .then(() => {
          console.log('日志更新成功')
        })
        .catch(err => {
          console.error('日志更新失败:', err)
          alert('更新日志失败，请重试')
        })
    }

    // 重置编辑状态
    isEditing.value = false
    editingId.value = null

    // 重置选择状态
    selectedItems.value = []
    selectedAll.value = false
  } else {
    // 新建模式：使用save函数添加新记录
    save(serializableRecord)

    // 重置选择状态
    selectedItems.value = []
    selectedAll.value = false
  }

  // 关闭弹窗
  showEditQSO.value = false
  editCallsignValue.value = ''

  // 使用nextTick确保DOM更新完成后再重置表单并聚焦输入框
  nextTick(() => {
    // 重置表单
    resetForm()

    // 重新聚焦到呼号输入框
    if (callsignInput.value) {
      callsignInput.value.focus()
      isInputFocused.value = true
    }
  })
}

// 重置表单
const resetForm = () => {
  // 重置日期时间
  if (dateInput.value) dateInput.value.value = ''
  if (timeInput.value) timeInput.value.value = ''

  // 重置其他字段
  selectedMode.value = 'FM'
  frequencyValue.value = '420.000'
  txSignalValue.value = '59'
  rxSignalValue.value = '59'
  powerValue.value = '5'
  qthValue.value = '' // 重置QTH位置

  // 重置通联内容
  showContent.value = false
  const textarea = document.querySelector('textarea[name="radio_content"]') as HTMLTextAreaElement
  if (textarea) {
    textarea.value = ''
  }

  // 重置QSL卡片状态
  showQSL.value = false
  qslSentStatus.value = '未发送'
  qslReceivedStatus.value = '未接收'
  qslSentDate.value = ''
  qslReceivedDate.value = ''
}
</script>

<style scoped lang="less">
@import '../style/mixins.less';
@import '../style/hamlog.less';
</style>
