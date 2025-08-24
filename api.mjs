import api from 'api'
import { settings } from './config.mjs'
import { readOrFetchData, downloadFile } from './utils.mjs'

const sdk = api('@teachable/v1.1#3vgls24wlh9fbo7a')

sdk.auth(settings.API_KEY)

export const getPricingPlans = () => {
  return readOrFetchData(
    `${settings.CACHE_DIR}/pricingPlans/pricingPlans.json`,
    async () => {
      const { data } = await sdk.listPricingPlans()
      return data.pricing_plans
    }
  )
}

export const getPricingPlan = id => {
  return readOrFetchData(
    `${settings.CACHE_DIR}/pricingPlans/${id}/pricingPlan.json`,
    async () => {
      const { data } = await sdk.showPricingPlans({ pricing_plan_id: id })
      return data.pricing_plan
    }
  )
}

export const getUsers = () => {
  return readOrFetchData(`${settings.CACHE_DIR}/users/users.json`, async () => {
    const { data } = await sdk.listUsers()
    return data.users
  })
}

export const getUser = id => {
  return readOrFetchData(`${settings.CACHE_DIR}/users/${id}/user.json`, async () => {
    const { data } = await sdk.showUser({ user_id: id })
    return data
  })
}

export const getCourses = () => {
  return readOrFetchData(`${settings.CACHE_DIR}/courses/courses.json`, async () => {
    const { data } = await sdk.listCourses()
    return data.courses
  })
}

export const getCourse = courseId => {
  const coursePath = `${settings.CACHE_DIR}/courses/${courseId}`

  return readOrFetchData(`${coursePath}/course.json`, async () => {
    const { data } = await sdk.showCourse({ course_id: courseId })

    await downloadFile(data.course.image_url, coursePath)

    return data.course
  })
}

export const getLecture = async (courseId, sectionId, lectureId) => {
  const lecturePath = `${settings.CACHE_DIR}/courses/${courseId}/sections/${sectionId}/lectures/${lectureId}`

  // Step 1: Fetch or read lecture data (metadata)
  const lectureData = await readOrFetchData(`${lecturePath}/lecture.json`, async () => {
    const { data } = await sdk.showLecture({
      course_id: courseId,
      lecture_id: lectureId,
    });
    // Return only the core lecture data needed for caching, attachments will be handled outside
    return data.lecture;
  });

  // Step 2: Process attachments using the fetched/cached lectureData
  // This loop will now always run, using lectureData obtained from cache or fetch.
  // Ensure lectureData and lectureData.attachments exist before looping
  if (lectureData && lectureData.attachments) {
    for (let { url } of lectureData.attachments) {
      await downloadFile(url, lecturePath);
    }
  }

  return lectureData; // Return the lecture data
};
