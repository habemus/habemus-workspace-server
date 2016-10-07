exports.projects = [
  {
    _id: 'project-1-id',
    code: 'project-1-code',
    billingStatus: {
      value: 'enabled',
    },
  },
  {
    _id: 'project-2-id',
    code: 'project-2-code',
    billingStatus: {
      value: 'disabled',
    },
  }
];

exports.projectVersions = [
  {
    code: 'v1',
    projectId: 'project-1-id',
    srcSignedURL: 'http://localhost:9000/files/website-1.com.zip',
    buildStatus: {
      value: 'succeeded',
    }
  },
  {
    code: 'v2',
    projectId: 'project-1-id',
    srcSignedURL: 'http://localhost:9000/files/website-1.com.zip',
    buildStatus: {
      value: 'succeeded',
    }
  },
  {
    code: 'v1',
    projectId: 'project-2-id',
    srcSignedURL: 'http://localhost:9000/files/website-2.com.zip',
    buildStatus: {
      value: 'succeeded',
    }
  },
  {
    code: 'v2',
    projectId: 'project-2-id',
    srcSignedURL: 'http://localhost:9000/files/website-2.com.zip',
    buildStatus: {
      value: 'succeeded',
    }
  },
  {
    code: 'v3',
    projectId: 'project-2-id',
    srcSignedURL: 'http://localhost:9000/files/website-2.com.zip',
    buildStatus: {
      value: 'succeeded',
    }
  }
];