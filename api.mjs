import api from 'api'
import { API_KEY, CACHE_DIR, FILE_CONCURRENCY } from './config.mjs'
import { readOrFetchData, downloadFile } from './utils.mjs'

const sdk = api('@teachable/v1.1#3vgls24wlh9fbo7a')

sdk.auth(API_KEY)

export const getCourses = () => {
  return readOrFetchData(`${CACHE_DIR}/courses.json`, async () => {
    const { data } = await sdk.listCourses()
    return data.courses
  })
}

export const getCourse = courseId => {
  const coursePath = `${CACHE_DIR}/courses/${courseId}`

  return readOrFetchData(`${coursePath}/course.json`, async () => {
    const { data } = await sdk.showCourse({ course_id: courseId })

    await downloadFile(data.course.image_url, coursePath)

    return data.course
  })
}

export const getLecture = async (courseId, sectionId, lectureId) => {
  const lecturePath = `${CACHE_DIR}/courses/${courseId}/sections/${sectionId}/lectures/${lectureId}`

  return readOrFetchData(`${lecturePath}/lecture.json`, async () => {
    const { data } = await sdk.showLecture({
      course_id: courseId,
      lecture_id: lectureId,
    })

    for (let { url } of data.lecture.attachments) {
      await downloadFile(url, lecturePath)
    }

    return data.lecture
  })
}
