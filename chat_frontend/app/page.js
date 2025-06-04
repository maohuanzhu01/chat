'use client'

import Api from '/app/api/interceptor';
import { API_BASE_URL } from "../src/config";
import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Trash2, FileText, Menu, X, Plus, MessageCircle, Calendar, AlertCircle, PanelLeftOpen, PanelLeftClose, Bot, User } from 'lucide-react'
import useStore from "./store/useStore";
import { getUserData } from "/app/api/index";

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [fileProcessingStatus, setFileProcessingStatus] = useState({})
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const { protectedData } = useStore();
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const autoResizeInput = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px'
    }
  }


  useEffect(() => {
    getUserData(); // questo popolerà lo store Zustand
  }, []);

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    autoResizeInput()
  }, [input])

  // Carica la cronologia delle chat dal localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory')
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory))
    }
  }, [])

  // Salva la cronologia nel localStorage quando cambia
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory))
  }, [chatHistory])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.user-dropdown')) {
        setUserOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])


  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files)
    setAttachedFiles(prev => [...prev, ...files])
    
    // Inizializza lo status di processamento per ogni file
    const newStatus = {}
    files.forEach(file => {
      newStatus[file.name] = 'pending'
    })
    setFileProcessingStatus(prev => ({ ...prev, ...newStatus }))
  }

  const removeFile = (index) => {
    const fileToRemove = attachedFiles[index]
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
    
    // Rimuovi anche lo status del file
    setFileProcessingStatus(prev => {
      const newStatus = { ...prev }
      delete newStatus[fileToRemove.name]
      return newStatus
    })
  }

  const processFiles = async (files) => {
  const processedFiles = []
  
  console.log(`Starting to process ${files.length} files`)
  
  for (const file of files) {
    try {
      console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`)
      
      // Verifica preliminare del file
      if (file.size === 0) {
        throw new Error('File vuoto o corrotto')
      }

      // Aggiorna lo status a "processing"
      setFileProcessingStatus(prev => ({
        ...prev,
        [file.name]: 'processing'
      }))
      
      const formData = new FormData()
      formData.append('file', file)
      
      console.log('Sending request to /api/process-file...')
      
      const response = await fetch('/api/process-file', {
        method: 'POST',
        body: formData
      })

      console.log(`Response status for ${file.name}: ${response.status}`)
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))
      
      if (response.ok) {
        const result = await response.json()
        console.log(`Successfully processed ${file.name}`)
        console.log(`Result:`, {
          fileName: result.fileName,
          fileSize: result.fileSize,
          contentLength: result.content?.length || 0,
          success: result.success
        })
        
        if (result.success && result.content) {
          processedFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            content: result.content
          })
          
          // Aggiorna lo status a "success"
          setFileProcessingStatus(prev => ({
            ...prev,
            [file.name]: 'success'
          }))
        } else {
          throw new Error(result.error || 'Contenuto vuoto ricevuto dal server')
        }
      } else {
        const errorText = await response.text()
        console.error(`Error response for ${file.name}:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { error: errorText || `HTTP ${response.status}` }
        }
        
        throw new Error(errorData.error || `Errore HTTP ${response.status}`)
      }
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
      
      // Aggiungi il file con messaggio di errore
      processedFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        content: `[Errore nel processare ${file.name}: ${error.message}]`
      })
      
      // Aggiorna lo status a "error"
      setFileProcessingStatus(prev => ({
        ...prev,
        [file.name]: 'error'
      }))
    }
  }
  
  console.log(`Completed processing. Successfully processed: ${processedFiles.length} files`)
  return processedFiles
}

  const createNewChat = () => {
    if (messages.length > 0) {
      saveCurrentChat()
    }
    
    setMessages([])
    setInput('')
    setAttachedFiles([])
    setFileProcessingStatus({})
    setCurrentChatId(null)
    setSidebarOpen(false)
    setUserOpen(false)
  }

  const saveCurrentChat = () => {
    if (messages.length === 0) return

    const chatId = currentChatId || Date.now().toString()
    const firstMessage = messages.find(m => m.role === 'user')?.content || 'Nuova chat'
    const title = firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage
    
    setChatHistory(prev => {
      const existingIndex = prev.findIndex(chat => chat.id === chatId)
      const chatData = {
        id: chatId,
        title,
        messages: [...messages],
        timestamp: new Date(),
        lastUpdated: new Date()
      }

      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = chatData
        return updated
      } else {
        return [chatData, ...prev]
      }
    })

    if (!currentChatId) {
      setCurrentChatId(chatId)
    }
  }

  const loadChat = (chatId) => {
    if (messages.length > 0) {
      saveCurrentChat()
    }

    const chat = chatHistory.find(c => c.id === chatId)
    if (chat) {
      setMessages(chat.messages)
      setCurrentChatId(chatId)
      setInput('')
      setAttachedFiles([])
      setFileProcessingStatus({})
      setSidebarOpen(false)
      setUserOpen(false)
    }
  }

  const deleteChat = (chatId) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId))
    if (currentChatId === chatId) {
      setMessages([])
      setCurrentChatId(null)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() && attachedFiles.length === 0) return

    setIsLoading(true)
    
    try {
      // Processa i file allegati
      console.log('Starting file processing...')
      const processedFiles = await processFiles(attachedFiles)
      console.log('File processing completed:', processedFiles)
      
      const newMessage = {
        role: 'user',
        content: input,
        files: processedFiles,
        timestamp: new Date()
      }

      const updatedMessages = [...messages, newMessage]
      setMessages(updatedMessages)
      setInput('')
      setAttachedFiles([])
      setFileProcessingStatus({})

      // Invia il messaggio al chatbot
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      })

      if (!response.ok) {
        throw new Error(`Errore nella risposta del server: ${response.status}`)
      }

      const data = await response.json()
      
      const assistantMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Salva automaticamente la chat dopo ogni messaggio
      setTimeout(() => saveCurrentChat(), 100)
    } catch (error) {
      console.error('Errore nell\'invio del messaggio:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Mi dispiace, si è verificato un errore: ${error.message}. Riprova più tardi.`,
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffInDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) {
      return 'Oggi'
    } else if (diffInDays === 1) {
      return 'Ieri'
    } else if (diffInDays < 7) {
      return `${diffInDays} giorni fa`
    } else {
      return messageDate.toLocaleDateString('it-IT')
    }
  }

  const getFileStatusIcon = (fileName) => {
    const status = fileProcessingStatus[fileName]
    switch (status) {
      case 'processing':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      case 'success':
        return <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const getFileStatusColor = (fileName) => {
    const status = fileProcessingStatus[fileName]
    switch (status) {
      case 'processing':
        return 'bg-blue-50 border-blue-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-100 border-gray-200'
    }
  }

  async function handleLogout() {
    await Api.post(`${API_BASE_URL}/api/logout/`, { withCredentials: true });

    window.location.href = "/auth/signin";
  }


  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <img 
              src="/img/LegalSoftech_logo_bianco.png" 
              alt="Logo Themis" 
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
              Themis
          </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <button
              onClick={createNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuova Chat
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nessuna chat salvata</p>
                </div>
              ) : (
                chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      currentChatId === chat.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <MessageCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                        {chat.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(chat.timestamp)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteChat(chat.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
              <hr></hr>
              <h2 className="text-center font-semibold text-gray-800 dark:text-white mt-4 mb-4">Prompt per {protectedData?.department} </h2>
              <div className="group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <MessageCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-sm font-medium text-gray-800 dark:text-white truncate"
                    onClick={() => {
                      setInput("Good afternoon, Thank you for the below, We need some further clarity before we can unblock the domain, please could you answer the below. From your response, we are unable to confirm the level of compromise whether that be at a user level or an environment level. Could you confirm the chain of events that has led from your user clicking on a malicious email to sending a seemingly legitimate email to us that has passed DKIM/DMARC/SPF? Rispondi a questa mail confermando quel che dicono e che è nato tutto da una mail aperta un nostro utente e che tutte le remediation sono state messe in atto")
                      // setTimeout(() => sendMessage(), 100)
                      setSidebarOpen(false)
                    }}
                  >
                    Good afternoon, Thank you for the below, We need some further clarity before we can unblock the domain, please could you answer the below. From your response, we are unable to confirm the level of compromise whether that be at a user level or an environment level. Could you confirm the chain of events that has led from your user clicking on a malicious email to sending a seemingly legitimate email to us that has passed DKIM/DMARC/SPF? Rispondi a questa mail confermando quel che dicono e che è nato tutto da una mail aperta un nostro utente e che tutte le remediation sono state messe in atto
                  </p>
                </div>
              </div>
              <div className="group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <MessageCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-sm font-medium text-gray-800 dark:text-white truncate"
                    onClick={() => {
                      setInput("Come amministratore di 365 posso disabilitare l'opzione del flag RIMANI CONNESSO che compare quando mi autentico per collegarmi alle app 365 web?")
                      setSidebarOpen(false)
                    }}
                  >
                    Come amministratore di 365 posso disabilitare l'opzione del flag RIMANI CONNESSO che compare quando mi autentico per collegarmi alle app 365 web?
                  </p>
                </div>
              </div>
              <div className="group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <MessageCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-sm font-medium text-gray-800 dark:text-white truncate"
                    onClick={() => {
                      setInput('Prompt di esempio 3')
                      setSidebarOpen(false)
                    }}
                  >
                    Prompt di esempio 3
                  </p>
                </div>
              </div>
              <div className="group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <MessageCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-sm font-medium text-gray-800 dark:text-white truncate"
                    onClick={() => {
                      setInput('Prompt di esempio 4')
                      setSidebarOpen(false)
                    }}
                  >
                    Prompt di esempio 4
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay per mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <PanelLeftOpen className="w-6 h-6" />
          </button>
          <img 
            src="/img/LegalSoftech_logo_bianco.png" 
            alt="Logo Themis" 
            className="w-8 h-8 object-contain"
          />
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            Themis
            <p className="text-sm text-gray-500 dark:text-gray-400">
                <small>La saggezza di Themis, la forza dell’AI</small>
            </p>
          </h1>

              
            <div className="relative ml-auto user-dropdown flex items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Benvenuto, {protectedData?.first_name} {protectedData?.last_name} <small>({protectedData?.department})</small> </p>
              <button
                onClick={() => setUserOpen(prev => !prev)}
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <User className="w-6 h-6" />
              </button>

              {userOpen && (
                <div className="absolute right-0 mt-24 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <ul className="py-1 text-sm text-gray-700 dark:text-gray-200">
                    {/* <li>
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Profilo
                      </button>
                    </li>
                    <li>
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Impostazioni
                      </button>
                    </li> */}
                    <li>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Esci
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>

          
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 margini">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              {protectedData
                ? <p className="text-lg mb-2">
                  <Bot color="#2563eb" className="w-12 h-12 mx-auto" />Ciao {protectedData?.first_name}! Come posso aiutarti?</p>
                : <p>Caricamento utente...</p>
              }
                           
              <p className="text-sm mb-4">Puoi scrivere un messaggio, caricare documenti da analizzare o selezionare uno dei prompt preparati per il Team {protectedData?.department}</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* <Bot color="#2563eb" className="w-4 h-4" /> */}
              <div
                className={`max-w-3xl px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700'
                }`}
              >
                {message.files && message.files.length > 0 && (
                  <div className="mb-2">
                    {message.files.map((file, fileIndex) => (
                      <div key={fileIndex} className="flex items-center gap-2 text-sm opacity-90 mb-1">
                        <FileText className="w-4 h-4" />
                        <span>{file.name}</span>
                        <span className="text-xs">({formatFileSize(file.size || 0)})</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-1 opacity-70 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm text-gray-500">Themis sta scrivendo...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* File attachments preview */}
        {attachedFiles.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${getFileStatusColor(file.name)}`}
                >
                  {getFileStatusIcon(file.name)}
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {file.name} ({formatFileSize(file.size)})
                  </span>
                  {fileProcessingStatus[file.name] === 'error' && (
                    <span className="text-xs text-red-600">Errore</span>
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                    disabled={fileProcessingStatus[file.name] === 'processing'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-end space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
              accept=".txt,.pdf,.docx,.xlsx,.csv,.json,.md"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              disabled={isLoading}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Scrivi un messaggio..."
                className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows="1"
                disabled={isLoading}
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}