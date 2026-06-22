import api from './api'

export const getRepositories = async () => {
  const response = await api.get('/repositories')
  return response.data
}

export const getRepositoryDetails = async (id) => {
  const response = await api.get(`/repositories/${id}`)
  return response.data
}

export const analyzeRepository = async (cloneUrl) => {
  const response = await api.post('/repositories/analyze', { clone_url: cloneUrl })
  return response.data
}

export const getRepositoryStack = async (id) => {
  const response = await api.get(`/repositories/${id}/stack`)
  return response.data
}

export const getRepositoryDependencies = async (id) => {
  const response = await api.get(`/repositories/${id}/dependencies`)
  return response.data
}

export const getRepositoryEnvironment = async (id) => {
  const response = await api.get(`/repositories/${id}/environment`)
  return response.data
}

export const getRepositoryDocumentation = async (id) => {
  const response = await api.get(`/repositories/${id}/documentation`)
  return response.data
}

export const deleteRepository = async (id) => {
  const response = await api.delete(`/repositories/${id}`)
  return response.data
}

export const deleteAllRepositories = async () => {
  const response = await api.delete('/repositories')
  return response.data
}

export const downloadRepositoryReport = async (id) => {
  const response = await api.get(`/repositories/${id}/report`, {
    responseType: 'blob'
  })
  return response
}

