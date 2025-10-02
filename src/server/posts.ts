import * as fs from 'fs'
import * as fse from 'fs-extra'
import * as path from 'path'
import matter from 'gray-matter'
import moment from 'moment'
import Bluebird from 'bluebird'
import junk from 'junk'
import Model from './model'
import { IPost, IPostDb } from './interfaces/post'
import ContentHelper from '../helpers/content-helper'
import { formatYamlString } from '../helpers/utils'

Bluebird.promisifyAll(fs)

// Use Node.js built-in promises for better compatibility
const fsPromises = fs.promises

export default class Posts extends Model {
  postDir: string

  postImageDir: string

  constructor(appInstance: any) {
    super(appInstance)
    this.postDir = path.join(this.appDir, 'posts')
    this.postImageDir = `${this.appDir}/post-images`
  }

  public async savePosts() {
    const resultList: any = []
    const requestList: any = []
    let files = await fse.readdir(this.postDir)

    files = files.filter(junk.not)
    files.forEach((item) => {
      requestList.push(fs.readFileSync(path.join(this.postDir, item), 'utf8'))
    })
    const results = await Bluebird.all(requestList)
    const fixedResults = JSON.parse(JSON.stringify(results))
    /**
     * The format of the correction `tag` is changed from a string to an array, and the article source file is updated. from v0.7.6
     */
    await Promise.all(results.map(async (result: any, index: any) => {
      const postMatter = matter(result)
      const data = (postMatter.data as any)

      data.title = formatYamlString(data.title)

      if (data && data.date) {
        if (typeof data.date === 'string') {
          data.date = moment(data.date).format('YYYY-MM-DD HH:mm:ss')
        } else {
          data.date = moment(data.date).subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss')
        }
      }

      // If there is a `tag` and it is of string type, it is corrected to array type.
      if (data && typeof data.tags === 'string') {
        const tagReg = /tags: [^\s[]/i
        const newTagString = data.tags.split(' ').map(tag => `'${tag}'`).join(', ')

        if (tagReg.test(result)) {
          const mdStr = `---
title: '${data.title}'
date: ${data.date}
tags: [${newTagString}]
published: ${data.published || false}
hideInList: ${data.hideInList || false}
feature: ${data.feature || ''}
isTop: ${data.isTop || false}
---
${postMatter.content}`

          fixedResults[index] = mdStr
          fse.writeFileSync(`${this.postDir}/${files[index]}`, mdStr)
        }
      }
    }))

    fixedResults.forEach((result: any, index: any) => {
      const postMatter = matter(result)

      const data = (postMatter.data as any)

      // Remove useless `'` in formatYamlString generate
      if (data && data.title) {
        data.title = String(data.title).replace(/''/g, '\'')
      }
      
      // Fix matter's formatted `date` problem
      if (data && data.date) {
        if (typeof data.date === 'string') {
          data.date = moment(data.date).format('YYYY-MM-DD HH:mm:ss')
        } else {
          data.date = moment(data.date).subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss')
        }
      }

      delete postMatter.orig // Remove orig <Buffer>
      const post = {
        ...postMatter,
        abstract: '',
        fileName: '',
      }

      const moreReg = /\n\s*<!--\s*more\s*-->\s*\n/i
      const matchMore = moreReg.exec(post.content)
      if (matchMore) {
        post.abstract = (post.content).substring(0, matchMore.index) // Abstract
      }

      post.fileName = files[index].substring(0, files[index].length - 3) // To be optimized!
      resultList.push(post)
    })

    const list: any = []
    resultList.forEach((item: any) => {
      // Articles migrated from hexo or other platforms do not have a `published` field
      if (item.data.published === undefined) {
        item.data.published = false
      }

      // Articles migrated from other platforms or old articles do not have `hideInList` fields
      if (item.data.hideInList === undefined) {
        item.data.hideInList = false
      }

      // Articles migrated from other platforms or old articles do not have `isTop` fields
      if (item.data.isTop === undefined) {
        item.data.isTop = false
      }

      list.push(item)
    })

    list.sort((a: any, b: any) => moment(b.data.date).unix() - moment(a.data.date).unix())

    // Enhanced tag logging for database update
    console.log('🏷️ [TAGS_DEBUG] Database update - savePosts completed:', {
      totalPosts: list.length,
      postsWithTags: list.filter(item => item.data.tags && item.data.tags.length > 0).length,
      sampleTags: list.slice(0, 3).map(item => ({
        title: item.data.title,
        tags: item.data.tags,
        hasTags: item.data.tags && item.data.tags.length > 0,
      })),
      postsDir: this.postDir,
    })

    const writeResult = this.$posts.set('posts', list).write()
    console.log('🏷️ [TAGS_DEBUG] Database write completed:', {
      writeResult: writeResult,
      databasePath: `${this.appDir}/config/posts.json`,
      updatedPostsCount: list.length,
    })

    return true
  }

  public async reloadPosts() {
    // Re-read all markdown files from the post directory
    console.log(`📚 [DATABASE] Starting database reload from post directory: ${this.postDir}`)
    const resultList: any = []
    let files = await fse.readdir(this.postDir)
    console.log(`📁 [DATABASE] Found ${files.length} files in post directory`)

    files = files.filter(junk.not)
    console.log(`🔍 [DATABASE] Filtered to ${files.length} valid markdown files`)

    // Read and parse all markdown files
    await Promise.all(files.map(async (file) => {
      try {
        console.log(`📖 [DATABASE] Reading file: ${file}`)
        const content = await fsPromises.readFile(path.join(this.postDir, file), 'utf8')
        const postMatter = matter(content)

        const data = postMatter.data as any

        // Format title
        if (data && data.title) {
          data.title = formatYamlString(data.title)
          // Remove useless `'` in formatYamlString generate
          data.title = String(data.title).replace(/''/g, '\'')
        }

        // Format date
        if (data && data.date) {
          if (typeof data.date === 'string') {
            data.date = moment(data.date).format('YYYY-MM-DD HH:mm:ss')
          } else {
            data.date = moment(data.date).subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss')
          }
        }

        // Set default values for missing fields
        if (data.published === undefined) {
          data.published = false
        }
        if (data.hideInList === undefined) {
          data.hideInList = false
        }
        if (data.isTop === undefined) {
          data.isTop = false
        }

        delete postMatter.orig // Remove orig <Buffer>
        const post = {
          ...postMatter,
          abstract: '',
          fileName: file.substring(0, file.length - 3), // Remove .md extension
        }

        // Extract abstract from more tag
        const moreReg = /\n\s*<!--\s*more\s*-->\s*\n/i
        const matchMore = moreReg.exec(post.content)
        if (matchMore) {
          post.abstract = post.content.substring(0, matchMore.index)
        }

        console.log(`✅ [DATABASE] Successfully parsed post: ${data.title || 'Untitled'} (${post.fileName})`)
        resultList.push(post)
      } catch (error) {
        console.error(`❌ [DATABASE] Error reading file ${file}:`, error)
      }
    }))

    // Sort posts by date (newest first)
    resultList.sort((a: any, b: any) => moment(b.data.date).unix() - moment(a.data.date).unix())
    console.log(`📊 [DATABASE] Sorted ${resultList.length} posts by date (newest first)`)

    // Get current posts count before update
    const currentPostsCount = this.$posts.get('posts').value() ? this.$posts.get('posts').value().length : 0
    console.log(`📈 [DATABASE] Current posts count in database: ${currentPostsCount}`)

    // Update the database with the fresh data
    this.$posts.set('posts', resultList).write()

    // CRITICAL FIX: Also update the in-memory database (appInstance.db.posts)
    // This ensures the renderer has access to the latest posts
    this.db.posts = resultList
    console.log(`💾 [DATABASE] Database updated with ${resultList.length} posts`)
    console.log(`🔄 [DATABASE] In-memory appInstance.db.posts synchronized with ${resultList.length} posts`)

    // Log details about published posts
    const publishedPosts = resultList.filter((post: any) => post.data.published === true)
    const draftPosts = resultList.filter((post: any) => post.data.published === false)
    console.log(`📰 [DATABASE] Published posts: ${publishedPosts.length}, Draft posts: ${draftPosts.length}`)

    // Log titles of published posts
    if (publishedPosts.length > 0) {
      console.log('📋 [DATABASE] Published posts list:')
      publishedPosts.forEach((post: any, index: number) => {
        console.log(`  ${index + 1}. ${post.data.title || 'Untitled'} (${post.fileName})`)
      })
    }

    console.log(`✅ [DATABASE] Database reload completed successfully! Reloaded ${resultList.length} posts from ${files.length} files`)
    return resultList
  }

  async list() {
    await this.savePosts()
    const posts = await this.$posts.get('posts').value()
    const helper = new ContentHelper()

    const list = posts.map((post: IPostDb) => {
      const item = JSON.parse(JSON.stringify(post))
      item.content = helper.changeImageUrlDomainToLocal(item.content, this.appDir)
      item.data.feature = item.data.feature && !item.data.feature.includes('http')
        ? helper.changeFeatureImageUrlDomainToLocal(item.data.feature, this.appDir)
        : item.data.feature
      return item
    })

    return list
  }

  /**
   * Save Post to file
   * @param post
   */
  async savePostToFile(post: IPost): Promise<IPost | null> {
    console.log(`📝 [FILE_SAVE] Starting to save post to file: ${post.fileName}`)
    console.log('📋 [FILE_SAVE] Post details:', {
      title: post.title,
      fileName: post.fileName,
      tags: post.tags,
      published: post.published,
      date: post.date,
      hasFeatureImage: !!post.featureImage.path,
      contentLength: post.content.length,
    })

    const helper = new ContentHelper()
    const content = helper.changeImageUrlLocalToDomain(post.content, this.db.setting.domain)
    const extendName = (post.featureImage.name || 'jpg').split('.').pop()

    console.log(`🖼️ [FILE_SAVE] Image extension: ${extendName}`)
    console.log(`🌐 [FILE_SAVE] Content processed for domain: ${this.db.setting.domain}`)

    post.title = formatYamlString(post.title)

    let frontMatter = `---
title: '${post.title}'
date: ${post.date}
tags: [${post.tags.map(tag => `'${tag}'`).join(', ')}]
published: ${post.published}
hideInList: ${post.hideInList}`

    // Only add feature line if there is a valid feature image
    if (post.featureImage.name) {
      frontMatter += `\nfeature: /post-images/${post.fileName}.${extendName}`
    } else if (post.featureImagePath && post.featureImagePath.trim() !== '') {
      frontMatter += `\nfeature: ${post.featureImagePath}`
    }

    frontMatter += `\nisTop: ${post.isTop}
---
${content}`

    const mdStr = frontMatter

    // Enhanced tag logging for markdown generation
    console.log('🏷️ [TAGS_DEBUG] Markdown frontmatter generation:', {
      fileName: post.fileName,
      title: post.title,
      inputTags: post.tags,
      inputTagsType: typeof post.tags,
      inputTagsIsArray: Array.isArray(post.tags),
      frontMatterPreview: frontMatter.split('\n').slice(0, 6).join('\n'),
      hasTagsInFrontmatter: frontMatter.includes('tags: ['),
    })

    console.log(`📄 [FILE_SAVE] Markdown content prepared, length: ${mdStr.length}`)

    try {
      // If exist feature image
      if (post.featureImage.path) {
        console.log(`🖼️ [FILE_SAVE] Processing feature image: ${post.featureImage.path}`)
        const filePath = `${this.postImageDir}/${post.fileName}.${extendName}`

        console.log(`📁 [FILE_SAVE] Target feature image path: ${filePath}`)

        if (post.featureImage.path !== filePath) {
          console.log(`📋 [FILE_SAVE] Copying feature image from ${post.featureImage.path} to ${filePath}`)
          fse.copySync(post.featureImage.path, filePath)
          console.log('✅ [FILE_SAVE] Feature image copied successfully')

          // Clean the old file
          if (post.featureImage.path.includes(this.postImageDir)) {
            console.log(`🗑️ [FILE_SAVE] Removing old feature image: ${post.featureImage.path}`)
            fse.removeSync(post.featureImage.path)
            console.log('✅ [FILE_SAVE] Old feature image removed')
          }
        } else {
          console.log('ℹ️ [FILE_SAVE] Feature image already at target location, skipping copy')
        }
      } else {
        console.log('ℹ️ [FILE_SAVE] No feature image to process')
      }

      // Write file must use fse, beause fs.writeFile need callback
      const markdownFilePath = `${this.postDir}/${post.fileName}.md`
      console.log(`📝 [FILE_SAVE] Writing markdown file to: ${markdownFilePath}`)
      await fse.writeFile(markdownFilePath, mdStr)
      console.log('✅ [FILE_SAVE] Markdown file written successfully')

      // Clean the old file
      if (post.deleteFileName) {
        const oldFilePath = `${this.postDir}/${post.deleteFileName}.md`
        console.log(`🗑️ [FILE_SAVE] Removing old file: ${oldFilePath}`)
        fse.removeSync(oldFilePath)
        console.log('✅ [FILE_SAVE] Old file removed successfully')
      }

      console.log(`🎉 [FILE_SAVE] Post save completed successfully: ${post.title}`)
    } catch (e) {
      console.error(`❌ [FILE_SAVE] Error saving post ${post.fileName}:`, e)
      console.error('❌ [FILE_SAVE] Error details:', {
        fileName: post.fileName,
        title: post.title,
        postDir: this.postDir,
        postImageDir: this.postImageDir,
        hasFeatureImage: !!post.featureImage.path,
        errorMessage: e instanceof Error ? e.message : String(e),
      })
      return null
    }
    return post
  }

  async deletePost(post: IPostDb) {
    try {
      const postUrl = `${this.postDir}/${post.fileName}.md`
      fse.removeSync(postUrl)

      // Clean feature image
      if (post.data.feature) {
        fse.removeSync(post.data.feature.replace('file://', ''))
      }

      // Clean post content image
      const imageReg = /(!\[.*?\]\()(.+?)(\))/g
      const imageList = post.content.match(imageReg)
      if (imageList) {
        const postImagePaths = imageList.map((item: string) => {
          const index = item.indexOf('(')
          return item.substring(index + 1, item.length - 1)
        })
        postImagePaths.forEach(async (filePath: string) => {
          fse.removeSync(filePath.replace('file://', ''))
        })
      }
      return true
    } catch (e) {
      console.error('Delete Error', e)
      return false
    }
  }

  async uploadImages(files: any[]) {
    await fse.ensureDir(this.postImageDir)
    const results = []
    for (const file of files) {
      const extendName = file.name.split('.').pop()
      const newFileName = new Date().getTime()
      const filePath = `${this.postImageDir}/${newFileName}.${extendName}`
      fse.copySync(file.path, filePath)
      results.push(filePath)
    }
    return results
  }
}
