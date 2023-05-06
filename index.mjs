import { map } from './utils.mjs'
import { getCourses, getCourse, getLecture } from './api.mjs'

//  1. Get all the courses.
const courses = await getCourses()

await map(courses, async ({ id: courseId }) => {
  //  2. For each course entry, get the full course object.
  const course = await getCourse(courseId)
  //  3. For each course object, get all the lecture entries.
  const lectures = course.lecture_sections.flatMap(section =>
    section.lectures.map(({ id }) => ({ sectionId: section.id, lectureId: id }))
  )

  await map(lectures, async ({ sectionId, lectureId }) => {
    //  4. For each lecture entry, get the full lecture object.
    await getLecture(courseId, sectionId, lectureId)
  })
})
