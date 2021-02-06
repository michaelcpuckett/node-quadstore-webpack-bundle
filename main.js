const {
  leveljs,
  Quadstore,
  DataFactory,
  newEngine,
} = quadstore;

const {
  toSparql,
  GraphQLConverter,
  ResultsConverter
} = utils

const main = async () => {
  const startTime = Date.now()
  const EX = `http://ex.io/`
  const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
  const XSD = 'http://www.w3.org/2001/XMLSchema#'
  const dataFactory = new DataFactory();
  const store = new Quadstore({
    dataFactory,
    backend: leveljs('quadstore'),
    comunica: newEngine()
  });

  console.log('After Initialize Store', Date.now() - startTime)
  await store.open();
  await store.clear();

  console.log('After Open & Clear Store', Date.now() - startTime)
  
  // QUERY AS GRAPHQL
  const queryStore = async (graphQL, context, singularizeVariables) => {
    const sparqlQuery = await new GraphQLConverter().graphqlToSparqlAlgebra(graphQL, {
      "@vocab": EX,
      "a": `${RDF}type`,
      ...context
    })
    const results = await store.sparql(toSparql(sparqlQuery))
    const resultsTree = new ResultsConverter().sparqlJsonResultsToTree({
      results: {
        bindings: results.items.map(item => Object.fromEntries(Object.entries(item).map(([ key, value ]) => [
          (key.startsWith('?on') && !key.includes('_')) ? key.split('_').slice(1).join('_').replace('?', '') : (key.startsWith('?on') ? key.split('_').slice(1).join('_').replace('?', '') : key.replace('?', '')),
          {
            type: [value.termType[0].toLowerCase(), ...value.termType.slice(1)].join(''),
            value: value.value
          }
        ])))
      }
    }, {
      singularizeVariables: {
        '': false,
        ...Object.fromEntries(results.variables.map(key => [
          (key.startsWith('?on') && !key.includes('_')) ? key.split('_').slice(1).join('_').replace('?', '') : (key.startsWith('?on') ? key.split('_').slice(1).join('_').replace('?', '') : key.replace('?', '')),
          true
        ])),
        ...singularizeVariables
      }
    })
    const handleResultTree = item => Object.fromEntries(Object.entries(item).map(([key, value]) => [
      key,
      value.value ? (key === 'id' ? Number(value.value.split('_').pop()) : value.value.replace(EX, '')) : handleResultTree(value)
    ]))
    return resultsTree.map(handleResultTree)
  }
  // ADD QUAD
  const addPresenter = async ({
    id,
    firstName,
    lastName,
    profilePic,
    lastActive,
    needsInvite
  }) => await store.sparql(`
    BASE <${EX}>
    PREFIX xsd: <${XSD}>
    INSERT DATA {
      <user_${id}>  a            <Presenter>;
                    <firstName>  "${firstName}"^^xsd:string;
                    <lastName>   "${lastName}"^^xsd:string;
                    <profilePic> "${profilePic}"^^xsd:string;
                    <lastActive> "${lastActive}"^^xsd:date;
                    <needsInvite> "${needsInvite}"^^xsd:boolean;
    }
  `)
  const addPresenters = async presenters => await Promise.all(presenters.map(presenter => addPresenter(presenter)))
  const addAudienceMember = async ({
    id,
    firstName,
    lastName
  }) => await store.sparql(`
    BASE <${EX}>
    PREFIX xsd: <${XSD}>
    INSERT DATA {
      <audienceMember_${id}>  a             <AudienceMember> ;
                      <firstName>   "${firstName}"^^xsd:string ;
                      <lastName>    "${lastName}"^^xsd:string ;
    }
  `)
  const addAudienceMembers = async audienceMembers => await Promise.all(audienceMembers.map(audienceMember => addAudienceMember(audienceMember)))
  const addPresentation = async ({
    id,
    name,
    presenter,
    audienceMembers
  }) => await store.sparql(`
    BASE <${EX}>
    PREFIX xsd: <${XSD}>
    INSERT DATA {
      <roster_${id}>  a         <Presentation> ;
                      <name>    "${name}"^^xsd:string ;
                      <presenter>    <user_${presenter}> ;
                    ${audienceMembers.map(audienceMember => `
                      <audienceMember> <audienceMember_${audienceMember}> ;
                    `).join('')}
    }
  `)
  const addPresentations = async presentations => await Promise.all(presentations.map(presentation => addPresentation(presentation)))
  await Promise.all([
    addPresenters([{
      id: 93258,
      firstName: 'Alice',
      lastName: 'Schwartz',
      profilePic: '/images/initials__M_P.png',
      lastActive: '2021-01-28T02:30:00Z'
    }, {
      id: 48484,
      firstName: 'Jane',
      lastName: 'Doe',
      profilePic: '/images/initials__J_D.png',
      lastActive: '2020-12-28T09:30:00Z'
    }, {
      id: 51111,
      firstName: 'Brianna',
      lastName: 'Greene',
      profilePic: '/images/initials__B_G.png',
      lastActive: '2021-01-11T09:30:00Z'
    }, {
      id: 51112,
      firstName: 'Jared',
      lastName: 'Bowman',
      profilePic: '/images/initials__J_B.png',
      lastActive: null
    }]),
    addPresentations([{
      id: 4561,
      name: 'Design and Code',
      presenter: 93258,
      audienceMembers: [
        111,
        222,
        333,
        555,
        777,
        999
      ]
    }, {
      id: 5001,
      name: 'New Browser Features',
      presenter: 93258,
      audienceMembers: [
        777,
        888,
        999
      ]
    }, {
      id: 4672,
      name: 'Math for JavaScript Engineers',
      presenter: 48484,
      audienceMembers: [
        111,
        222,
        333
      ]
    }, {
      id: 1242,
      name: 'Coding and Mental Health',
      presenter: 48484,
      audienceMembers: [
        222,
        333,
        777,
        999
      ]
    }, {
      id: 1493,
      name: 'Ecology and Economics of the Web',
      presenter: 51112,
      audienceMembers: [
        888,
        999,
        222
      ]
    }]),
    addAudienceMembers([{
      id: 111,
      firstName: 'John',
      lastName: 'Sandberg'
    }, {
      id: 222,
      firstName: 'Mary',
      lastName: 'Spark'
    }, {
      id: 333,
      firstName: 'Melanie',
      lastName: 'Wynn'
    }, {
      id: 444,
      firstName: 'Zane',
      lastName: 'Parker'
    }, {
      id: 555,
      firstName: 'Sarah',
      lastName: 'Goldberg'
    }, {
      id: 666,
      firstName: 'Brittany',
      lastName: 'Sanchez'
    }, {
      id: 777,
      firstName: 'Latisha',
      lastName: 'Conner'
    }, {
      id: 888,
      firstName: 'Luke',
      lastName: 'Rogers'
    }, {
      id: 999,
      firstName: 'Ginger',
      lastName: 'Adams'
    }])
  ])
  console.log('After Insert Data', Date.now() - startTime)

  await (async () => {
    const graphQLQuery = `
      {
        a(_: Presenter)
        id
        firstName
        lastName
        ... on Presenter {
          presentations {
            id,
            name
          }
          onPresentation {
            totalAudience {
              id
              firstName
              lastName
            }
          }
        }
      }
    `
    console.log(graphQLQuery)
    const queryResult = await queryStore(graphQLQuery, {
      "onPresentation": {
        "@reverse": "presenter",
        "@type": "@id"
      },
      "presentations": {
        "@reverse": "presenter"
      },
      "totalAudience": "audienceMember"
    }, {
      presentations: false
    })
    console.log(queryResult, Date.now() - startTime)
  })()


  const getPresenterById = async (id, {
    presentations,
    totalAudience
  } = {}) => {
    const graphQLQuery = `
      query {
        id(_:user_${id})
        firstName
        lastName
        ${presentations ? `
          presentations {
            id,
            name
          }
        ` : ''}
        ${totalAudience ? `
          onPresentation {
            totalAudience {
              id
              firstName
              lastName
            }
          }
        ` : ''}
      }
    `
    return (await queryStore(graphQLQuery, {
      "onPresentation": {
        "@reverse": "presenter",
        "@type": "@id"
      },
      "presentations": {
        "@reverse": "presenter"
      },
      "totalAudience": "audienceMember"
    }, {
      presentations: false
    }))
  }
  const myPresenter = await getPresenterById(93258, {
    presentations: true,
    totalAudience: true
  })
  console.log(myPresenter)
  await store.close();
};

main().catch((err) => {
  console.error(err);
});
